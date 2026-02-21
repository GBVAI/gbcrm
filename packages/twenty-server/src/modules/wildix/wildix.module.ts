import { Module } from '@nestjs/common';

import { WildixWebhookController } from 'src/modules/wildix/controllers/wildix-webhook.controller';
import { WildixWebhookService } from 'src/modules/wildix/services/wildix-webhook.service';
import { WildixCallProcessorService } from 'src/modules/wildix/services/wildix-call-processor.service';

@Module({
  controllers: [WildixWebhookController],
  providers: [WildixWebhookService, WildixCallProcessorService],
})
export class WildixModule {}
