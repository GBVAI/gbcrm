import { Module } from '@nestjs/common';

import { TwentyConfigModule } from 'src/engine/core-modules/twenty-config/twenty-config.module';
import { UserVarsModule } from 'src/engine/core-modules/user/user-vars/user-vars.module';
import { GlobalWorkspaceDataSourceModule } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-datasource.module';
import { WildixCallControlController } from 'src/modules/wildix/controllers/wildix-call-control.controller';
import { WildixWebhookController } from 'src/modules/wildix/controllers/wildix-webhook.controller';
import { WildixCallControlService } from 'src/modules/wildix/services/wildix-call-control.service';
import { WildixCallProcessorService } from 'src/modules/wildix/services/wildix-call-processor.service';
import { WildixHistoryService } from 'src/modules/wildix/services/wildix-history.service';
import { WildixWebhookService } from 'src/modules/wildix/services/wildix-webhook.service';

@Module({
  imports: [
    TwentyConfigModule,
    GlobalWorkspaceDataSourceModule,
    UserVarsModule,
  ],
  controllers: [WildixWebhookController, WildixCallControlController],
  providers: [
    WildixWebhookService,
    WildixCallProcessorService,
    WildixHistoryService,
    WildixCallControlService,
  ],
  exports: [
    WildixHistoryService,
    WildixCallProcessorService,
    WildixCallControlService,
  ],
})
export class WildixModule {}
