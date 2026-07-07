import { InjectDataSource } from '@nestjs/typeorm';

import { Command, CommandRunner, Option } from 'nest-commander';
import { isDefined } from 'twenty-shared/utils';
import { WorkspaceActivationStatus } from 'twenty-shared/workspace';
import { DataSource, type MigrationInterface } from 'typeorm';

import { CommandLogger } from 'src/database/commands/logger';
import { InstanceCommandRunnerService } from 'src/engine/core-modules/upgrade/services/instance-command-runner.service';
import { UpgradeCommandRegistryService } from 'src/engine/core-modules/upgrade/services/upgrade-command-registry.service';
import { UpgradeMigrationService } from 'src/engine/core-modules/upgrade/services/upgrade-migration.service';
import { UpgradeSequenceReaderService } from 'src/engine/core-modules/upgrade/services/upgrade-sequence-reader.service';
import { UpgradeSequenceRunnerService } from 'src/engine/core-modules/upgrade/services/upgrade-sequence-runner.service';
import { UpgradeStatusService } from 'src/engine/core-modules/upgrade/services/upgrade-status.service';
import { formatUpgradeLog } from 'src/engine/core-modules/upgrade/utils/format-upgrade-log.util';
import { WorkspaceVersionService } from 'src/engine/workspace-manager/workspace-version/services/workspace-version.service';
import { compareVersionMajorAndMinor } from 'src/utils/version/compare-version-minor-and-major';

type RawUpgradeCommandOptions = {
  workspaceId?: Set<string>;
  startFromWorkspaceId?: string;
  workspaceCountLimit?: number;
  dryRun?: boolean;
  verbose?: boolean;
};

export type ParsedUpgradeCommandOptions = {
  workspaceIds?: string[];
  startFromWorkspaceId?: string;
  workspaceCountLimit?: number;
  dryRun?: boolean;
  verbose?: boolean;
};

@Command({
  name: 'upgrade',
  description: 'Upgrade workspaces to the latest version',
})
export class UpgradeCommand extends CommandRunner {
  protected logger: CommandLogger;

  constructor(
    protected readonly upgradeCommandRegistryService: UpgradeCommandRegistryService,
    protected readonly upgradeSequenceReaderService: UpgradeSequenceReaderService,
    protected readonly upgradeSequenceRunnerService: UpgradeSequenceRunnerService,
    protected readonly instanceCommandRunnerService: InstanceCommandRunnerService,
    protected readonly upgradeMigrationService: UpgradeMigrationService,
    protected readonly workspaceVersionService: WorkspaceVersionService,
    protected readonly upgradeStatusService: UpgradeStatusService,
    @InjectDataSource()
    protected readonly dataSource: DataSource,
  ) {
    super();
    this.logger = new CommandLogger({
      verbose: false,
      constructorName: this.constructor.name,
    });
  }

  @Option({
    flags: '-d, --dry-run',
    description: 'Simulate the command without making actual changes',
    required: false,
  })
  parseDryRun(): boolean {
    return true;
  }

  @Option({
    flags: '-v, --verbose',
    description: 'Verbose output',
    required: false,
  })
  parseVerbose(): boolean {
    return true;
  }

  @Option({
    flags: '-w, --workspace-id [workspace_id]',
    description:
      'workspace id. Command runs on all active/suspended workspaces if not provided.',
    required: false,
  })
  parseWorkspaceId(val: string, previous?: Set<string>): Set<string> {
    const accumulator = previous ?? new Set<string>();

    accumulator.add(val);

    return accumulator;
  }

  @Option({
    flags: '--start-from-workspace-id [workspace_id]',
    description:
      'Start from a specific workspace id. Workspaces are processed in ascending order of id.',
    required: false,
  })
  parseStartFromWorkspaceId(val: string): string {
    return val;
  }

  @Option({
    flags: '--workspace-count-limit [count]',
    description:
      'Limit the number of workspaces to process. Workspaces are processed in ascending order of id.',
    required: false,
  })
  parseWorkspaceCountLimit(val: string): number {
    const limit = parseInt(val);

    if (isNaN(limit)) {
      throw new Error('Workspace count limit must be a number');
    }

    if (limit <= 0) {
      throw new Error('Workspace count limit must be greater than 0');
    }

    return limit;
  }

  override async run(
    _passedParams: string[],
    options: RawUpgradeCommandOptions,
  ): Promise<void> {
    if (options.verbose) {
      this.logger = new CommandLogger({
        verbose: true,
        constructorName: this.constructor.name,
      });
    }

    if (
      isDefined(options.workspaceId) &&
      isDefined(options.startFromWorkspaceId)
    ) {
      throw new Error(
        'Cannot use --start-from-workspace-id together with -w/--workspace-id',
      );
    }

    try {
      await this.runLegacyPendingTypeOrmMigrations();
      await this.runBootstrapMigrations();
      await this.runLegacy1_21InstanceCommands();
      await this.guardAllActiveOrSuspendedWorkspacesAreIn1_21_0();
      await this.backfillWorkspaceCreatedIn1_21_0Cursors();

      const sequence = this.upgradeSequenceReaderService.getUpgradeSequence();

      this.logger.log(
        formatUpgradeLog({
          humanMessage: `Initialized upgrade sequence: ${sequence.length} step(s)`,
          event: 'sequence.initialized',
          logFields: {
            stepCount: sequence.length,
            dryRun: options.dryRun ?? false,
          },
        }),
      );

      for (const [index, step] of sequence.entries()) {
        this.logger.verbose(
          formatUpgradeLog({
            humanMessage: `  [${index}] ${step.kind} — ${step.name} (${step.version})`,
            event: 'sequence.step',
            logFields: {
              index,
              kind: step.kind,
              name: step.name,
              version: step.version,
            },
          }),
        );
      }

      const { totalSuccesses, totalFailures } =
        await this.upgradeSequenceRunnerService.run({
          sequence,
          options: {
            ...options,
            workspaceIds: isDefined(options.workspaceId)
              ? Array.from(options.workspaceId)
              : undefined,
          },
        });

      this.logger.log(
        formatUpgradeLog({
          humanMessage: `Upgrade summary: ${totalSuccesses} workspace(s) succeeded, ${totalFailures} workspace(s) failed`,
          event: 'summary',
          logFields: {
            totalSuccesses,
            totalFailures,
            dryRun: options.dryRun ?? false,
          },
        }),
      );

      if (totalFailures > 0) {
        throw new Error(
          `Upgrade completed with ${totalFailures} workspace failure(s)`,
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error(
        formatUpgradeLog({
          humanMessage: `Upgrade failed: ${errorMessage}`,
          event: 'aborted',
        }),
      );
      throw error;
    } finally {
      await this.safeInvalidateUpgradeStatusCache();
    }
  }

  private async safeInvalidateUpgradeStatusCache(): Promise<void> {
    try {
      await this.upgradeStatusService.invalidateInstanceAndAllWorkspacesStatus();
    } catch (error) {
      this.logger.error(
        formatUpgradeLog({
          humanMessage: `Failed to invalidate upgrade-status cache: ${
            error instanceof Error ? error.message : String(error)
          }`,
          event: 'cache.invalidate.failed',
        }),
      );
    }
  }

  private async runLegacyPendingTypeOrmMigrations(): Promise<void> {
    this.logger.log(
      formatUpgradeLog({
        humanMessage: 'Running legacy TypeORM migrations...',
        event: 'legacy-typeorm.start',
      }),
    );

    const migrations = await this.dataSource.runMigrations({
      transaction: 'each',
    });

    if (migrations.length === 0) {
      this.logger.log(
        formatUpgradeLog({
          humanMessage: 'No pending legacy TypeORM migrations',
          event: 'legacy-typeorm.none',
        }),
      );
    } else {
      this.logger.log(
        formatUpgradeLog({
          humanMessage: `Executed ${migrations.length} legacy migration(s): ${migrations.map((migration) => migration.name).join(', ')}`,
          event: 'legacy-typeorm.completed',
          logFields: {
            migrationCount: migrations.length,
          },
        }),
      );
    }
  }

  private async runLegacy1_21InstanceCommands(): Promise<void> {
    const hasStartedCursorBased1_22Upgrade =
      await this.hasCompletedAnyCommandForVersion('1.22.0');

    if (hasStartedCursorBased1_22Upgrade) {
      this.logger.log(
        formatUpgradeLog({
          humanMessage:
            'Skipping legacy 1.21 instance command replay: 1.22 cursor-based upgrade has already started',
          event: 'legacy-1-21-instance.skipped',
        }),
      );

      return;
    }

    const legacy1_21Bundle =
      this.upgradeCommandRegistryService.getBundleForVersion('1.21.0');

    for (const { command, name } of legacy1_21Bundle.fastInstanceCommands) {
      const result =
        await this.instanceCommandRunnerService.runFastInstanceCommand({
          command,
          name,
        });

      if (result.status === 'failed') {
        throw result.error;
      }
    }

    for (const { command, name } of legacy1_21Bundle.slowInstanceCommands) {
      const result =
        await this.instanceCommandRunnerService.runSlowInstanceCommand({
          command,
          name,
          skipDataMigration: false,
        });

      if (result.status === 'failed') {
        throw result.error;
      }
    }
  }

  private async hasCompletedAnyCommandForVersion(
    version: string,
  ): Promise<boolean> {
    const prefix = `${version}_`;
    const [result]: Array<{ exists?: boolean | string }> =
      await this.dataSource.query(
        `SELECT EXISTS (
          SELECT 1
          FROM "core"."upgradeMigration"
          WHERE "status" = 'completed'
            AND LEFT("name", $2) = $1
        ) AS "exists"`,
        [prefix, prefix.length],
      );

    return result?.exists === true || result?.exists === 'true';
  }

  private async guardAllActiveOrSuspendedWorkspacesAreIn1_21_0(): Promise<void> {
    const MINIMUM_VERSION = '1.21.0';

    const [versionColumnResult]: Array<{ exists?: boolean | string }> =
      await this.dataSource.query(
        `SELECT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'core'
            AND table_name = 'workspace'
            AND column_name = 'version'
        ) AS "exists"`,
      );

    const hasVersionColumn =
      versionColumnResult?.exists === true ||
      versionColumnResult?.exists === 'true';

    if (!hasVersionColumn) {
      this.logger.log(
        formatUpgradeLog({
          humanMessage:
            'Skipping legacy workspace.version guard: column no longer exists',
          event: 'legacy-workspace-version.skipped',
        }),
      );

      return;
    }

    const activeOrSuspendedWorkspaces: Array<{
      id: string;
      version: string | null;
    }> = await this.dataSource.query(
      `SELECT "id", "version"
       FROM "core"."workspace"
       WHERE "activationStatus" = ANY($1)`,
      [[WorkspaceActivationStatus.ACTIVE, WorkspaceActivationStatus.SUSPENDED]],
    );

    const workspacesBelowMinimum = activeOrSuspendedWorkspaces.filter(
      (workspace) => {
        const version = workspace.version;

        if (version === null) {
          return true;
        }

        return (
          compareVersionMajorAndMinor(version, MINIMUM_VERSION) === 'lower'
        );
      },
    );

    if (workspacesBelowMinimum.length > 0) {
      const listing = workspacesBelowMinimum
        .map(
          (workspace) =>
            `  - ${workspace.id} (version: ${workspace.version ?? 'null'})`,
        )
        .join('\n');

      throw new Error(
        `Cannot upgrade: ${workspacesBelowMinimum.length} workspace(s) have a version below ${MINIMUM_VERSION}.\n` +
          `All workspaces must be upgraded to at least ${MINIMUM_VERSION} before running the cursor-based upgrade.\n` +
          `Affected workspaces:\n${listing}`,
      );
    }
  }

  // Workspaces created during 1.21 were activated before the cursor-based
  // upgrade system existed. They have no upgradeMigration record yet.
  // Stamp them with the last 1.21 workspace command as their initial cursor.
  private async backfillWorkspaceCreatedIn1_21_0Cursors(): Promise<void> {
    const allWorkspaceIds =
      await this.workspaceVersionService.getActiveOrSuspendedWorkspaceIds();

    if (allWorkspaceIds.length === 0) {
      return;
    }

    const version1_21WorkspaceCommands =
      this.upgradeCommandRegistryService.getBundleForVersion(
        '1.21.0',
      ).workspaceCommands;

    const lastWorkspaceCommand =
      version1_21WorkspaceCommands[version1_21WorkspaceCommands.length - 1];

    if (!lastWorkspaceCommand) {
      throw new Error(
        `Cannot backfill workspace cursors: no workspace commands found for version 1.21.0`,
      );
    }

    const existingCursorWorkspaceIds: { workspaceId: string }[] =
      await this.dataSource.query(
        `SELECT DISTINCT "workspaceId"
         FROM "core"."upgradeMigration"
         WHERE "workspaceId" IS NOT NULL
           AND "name" = ANY($1)`,
        [version1_21WorkspaceCommands.map((command) => command.name)],
      );

    const existingCursorSet = new Set(
      existingCursorWorkspaceIds.map((row) => row.workspaceId),
    );

    const workspacesWithoutCursor = allWorkspaceIds.filter(
      (workspaceId) => !existingCursorSet.has(workspaceId),
    );

    if (workspacesWithoutCursor.length === 0) {
      return;
    }

    this.logger.log(
      formatUpgradeLog({
        humanMessage: `Backfilling initial cursor for ${workspacesWithoutCursor.length} workspace(s) → "${lastWorkspaceCommand.name}"`,
        event: 'legacy-workspace-cursor.backfill',
        logFields: {
          workspaceCount: workspacesWithoutCursor.length,
          commandName: lastWorkspaceCommand.name,
        },
      }),
    );

    for (const workspaceId of workspacesWithoutCursor) {
      await this.upgradeMigrationService.markAsWorkspaceInitial({
        name: lastWorkspaceCommand.name,
        workspaceId,
        executedByVersion: '1.21.0',
        status: 'completed',
      });
    }

    // GBCRM bridge from the legacy workspace.version runner:
    // workspaces upgraded before the cursor-based engine need a non-initial
    // cursor too, otherwise UpgradeSequenceRunnerService cannot infer the
    // starting point because it intentionally ignores isInitial rows when
    // resolving the global last-attempted command.
    await this.upgradeMigrationService.recordUpgradeMigration({
      name: lastWorkspaceCommand.name,
      workspaceIds: workspacesWithoutCursor,
      isInstance: false,
      status: 'completed',
      executedByVersion: '1.21.0',
    });
  }

  // Schema changes required by the upgrade engine itself (e.g. new columns
  // on upgradeMigration) must be applied before the sequence runs.
  private async runBootstrapMigrations(): Promise<void> {
    const BOOTSTRAP_MIGRATION = 'AddIsInitialToUpgradeMigration1775909335324';

    const alreadyExecuted = await this.dataSource.query(
      `SELECT 1 FROM "core"."_typeorm_migrations" WHERE "name" = $1`,
      [BOOTSTRAP_MIGRATION],
    );

    if (alreadyExecuted.length > 0) {
      return;
    }

    const migration = this.dataSource.migrations.find(
      (migration: MigrationInterface) => migration.name === BOOTSTRAP_MIGRATION,
    );

    if (!migration) {
      throw new Error(
        `Bootstrap migration "${BOOTSTRAP_MIGRATION}" not found in registered migrations`,
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await migration.up(queryRunner);

      await queryRunner.query(
        `INSERT INTO "core"."_typeorm_migrations" ("timestamp", "name") VALUES ($1, $2)`,
        [1775909335324, BOOTSTRAP_MIGRATION],
      );

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();

      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
