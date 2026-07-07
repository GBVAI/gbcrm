import { Module } from '@nestjs/common';

import { WorkspaceIteratorModule } from 'src/database/commands/command-runners/workspace-iterator.module';
import { SyncStandardObjectsCommand } from 'src/database/commands/sync-standard-objects.command';
import { UpgradeCommand } from 'src/database/commands/upgrade-version-command/upgrade.command';
import { UpgradeModule } from 'src/engine/core-modules/upgrade/upgrade.module';
import { TwentyStandardApplicationModule } from 'src/engine/workspace-manager/twenty-standard-application/twenty-standard-application.module';
import { WorkspaceVersionModule } from 'src/engine/workspace-manager/workspace-version/workspace-version.module';

@Module({
  imports: [
    UpgradeModule,
    WorkspaceVersionModule,
    WorkspaceIteratorModule,
    TwentyStandardApplicationModule,
  ],
  providers: [UpgradeCommand, SyncStandardObjectsCommand],
  exports: [SyncStandardObjectsCommand],
})
export class UpgradeVersionCommandModule {}
