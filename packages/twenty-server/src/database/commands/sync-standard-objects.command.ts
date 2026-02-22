import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Command } from 'nest-commander';
import { Repository } from 'typeorm';

import { ActiveOrSuspendedWorkspacesMigrationCommandRunner } from 'src/database/commands/command-runners/active-or-suspended-workspaces-migration.command-runner';
import { RunOnWorkspaceArgs } from 'src/database/commands/command-runners/workspaces-migration.command-runner';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { DataSourceService } from 'src/engine/metadata-modules/data-source/data-source.service';
import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { TwentyStandardApplicationService } from 'src/engine/workspace-manager/twenty-standard-application/services/twenty-standard-application.service';

@Injectable()
@Command({
  name: 'workspace:sync-standard-objects',
  description:
    'Sync standard objects (including new ones like phoneCall) to all active workspaces',
})
export class SyncStandardObjectsCommand extends ActiveOrSuspendedWorkspacesMigrationCommandRunner {
  private readonly syncLogger = new Logger(SyncStandardObjectsCommand.name);

  constructor(
    @InjectRepository(WorkspaceEntity)
    protected readonly workspaceRepository: Repository<WorkspaceEntity>,
    protected readonly twentyORMGlobalManager: GlobalWorkspaceOrmManager,
    protected readonly dataSourceService: DataSourceService,
    private readonly twentyStandardApplicationService: TwentyStandardApplicationService,
  ) {
    super(workspaceRepository, twentyORMGlobalManager, dataSourceService);
  }

  override async runOnWorkspace({
    workspaceId,
  }: RunOnWorkspaceArgs): Promise<void> {
    this.syncLogger.log(
      `Syncing standard objects for workspace: ${workspaceId}`,
    );

    await this.twentyStandardApplicationService.synchronizeTwentyStandardApplicationOrThrow(
      { workspaceId },
    );

    this.syncLogger.log(
      `✅ Synced standard objects for workspace: ${workspaceId}`,
    );
  }
}
