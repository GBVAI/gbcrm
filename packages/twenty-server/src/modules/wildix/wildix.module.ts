import { Module } from '@nestjs/common';

import { TwentyConfigModule } from 'src/engine/core-modules/twenty-config/twenty-config.module';
import { GlobalWorkspaceDataSourceModule } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-datasource.module';
import { WildixWebhookController } from 'src/modules/wildix/controllers/wildix-webhook.controller';
import { WildixCallProcessorService } from 'src/modules/wildix/services/wildix-call-processor.service';
import { WildixHistoryService } from 'src/modules/wildix/services/wildix-history.service';
import { WildixWebhookService } from 'src/modules/wildix/services/wildix-webhook.service';

@Module({
  imports: [TwentyConfigModule, GlobalWorkspaceDataSourceModule],
  controllers: [WildixWebhookController],
  providers: [
    WildixWebhookService,
    WildixCallProcessorService,
    WildixHistoryService,
  ],
  exports: [WildixHistoryService, WildixCallProcessorService],
})
export class WildixModule {}
