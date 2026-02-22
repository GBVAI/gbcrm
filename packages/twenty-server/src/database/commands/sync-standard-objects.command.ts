import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Command, CommandRunner } from 'nest-commander';
import { Repository } from 'typeorm';

import { WorkspaceActivationStatus } from 'twenty-shared/workspace';

import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { TwentyStandardApplicationService } from 'src/engine/workspace-manager/twenty-standard-application/services/twenty-standard-application.service';

@Injectable()
@Command({
  name: 'workspace:sync-standard-objects',
  description:
    'Sync standard objects (including new ones like phoneCall) to all active workspaces',
})
export class SyncStandardObjectsCommand extends CommandRunner {
  private readonly logger = new Logger(SyncStandardObjectsCommand.name);

  constructor(
    @InjectRepository(WorkspaceEntity)
    private readonly workspaceRepository: Repository<WorkspaceEntity>,
    private readonly twentyStandardApplicationService: TwentyStandardApplicationService,
  ) {
    super();
  }

  async run(): Promise<void> {
    const workspaces = await this.workspaceRepository.find({
      select: ['id', 'displayName'],
      where: { activationStatus: WorkspaceActivationStatus.ACTIVE },
    });

    this.logger.log(`Found ${workspaces.length} active workspace(s) to sync`);

    for (const workspace of workspaces) {
      this.logger.log(`Syncing workspace: ${workspace.displayName} (${workspace.id})`);
      try {
        await this.twentyStandardApplicationService.synchronizeTwentyStandardApplicationOrThrow(
          { workspaceId: workspace.id },
        );
        this.logger.log(`✅ Synced: ${workspace.displayName}`);
      } catch (error) {
        this.logger.error(
          `❌ Failed to sync ${workspace.displayName}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    this.logger.log('Command completed!');
  }
}
