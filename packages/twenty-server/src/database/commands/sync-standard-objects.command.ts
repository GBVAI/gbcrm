import { Logger } from '@nestjs/common';

import { Command } from 'nest-commander';

import { ActiveOrSuspendedWorkspaceCommandRunner } from 'src/database/commands/command-runners/active-or-suspended-workspace.command-runner';
import {
  type RunOnWorkspaceArgs,
} from 'src/database/commands/command-runners/workspace.command-runner';
import { WorkspaceIteratorService } from 'src/database/commands/command-runners/workspace-iterator.service';
import { WorkspaceMigrationBuilderException } from 'src/engine/workspace-manager/workspace-migration/exceptions/workspace-migration-builder-exception';
import { TwentyStandardApplicationService } from 'src/engine/workspace-manager/twenty-standard-application/services/twenty-standard-application.service';

@Command({
  name: 'workspace:sync-standard-objects',
  description:
    'Sync standard objects (including new ones like phoneCall) to all active workspaces',
})
export class SyncStandardObjectsCommand extends ActiveOrSuspendedWorkspaceCommandRunner {
  private readonly syncLogger = new Logger(SyncStandardObjectsCommand.name);

  constructor(
    protected readonly workspaceIteratorService: WorkspaceIteratorService,
    private readonly twentyStandardApplicationService: TwentyStandardApplicationService,
  ) {
    super(workspaceIteratorService);
  }

  override async runOnWorkspace({
    workspaceId,
  }: RunOnWorkspaceArgs): Promise<void> {
    this.syncLogger.log(
      `Syncing standard objects for workspace: ${workspaceId}`,
    );

    try {
      await this.twentyStandardApplicationService.synchronizeTwentyStandardApplicationOrThrow(
        { workspaceId },
      );
    } catch (error) {
      if (error instanceof WorkspaceMigrationBuilderException) {
        this.syncLogger.error(
          `Validation errors:\n${JSON.stringify(error.failedWorkspaceMigrationBuildResult?.report, null, 2)}`,
        );
      }

      throw error;
    }

    this.syncLogger.log(
      `✅ Synced standard objects for workspace: ${workspaceId}`,
    );
  }
}
