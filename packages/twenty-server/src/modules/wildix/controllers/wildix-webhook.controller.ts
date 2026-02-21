import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  UseGuards,
} from '@nestjs/common';

import { NoPermissionGuard } from 'src/engine/guards/no-permission.guard';
import { PublicEndpointGuard } from 'src/engine/guards/public-endpoint.guard';
import { WildixWebhookService } from 'src/modules/wildix/services/wildix-webhook.service';
import { WildixCallProcessorService } from 'src/modules/wildix/services/wildix-call-processor.service';

@Controller('webhooks/wildix')
@UseGuards(PublicEndpointGuard, NoPermissionGuard)
export class WildixWebhookController {
  protected readonly logger = new Logger(WildixWebhookController.name);

  constructor(
    private readonly wildixWebhookService: WildixWebhookService,
    private readonly wildixCallProcessorService: WildixCallProcessorService,
  ) {}

  @Post('callback')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Body() body: Record<string, unknown>,
    @Headers('x-signature') signature: string | undefined,
  ): Promise<{ success: boolean }> {
    this.logger.log(
      `Received Wildix webhook event: ${JSON.stringify(body).substring(0, 200)}`,
    );

    const event = this.wildixWebhookService.parseEvent(body);

    if (!event) {
      this.logger.warn('Could not parse Wildix webhook event');

      return { success: false };
    }

    try {
      await this.wildixCallProcessorService.processCallEvent(event);

      return { success: true };
    } catch (error) {
      this.logger.error(
        `Error processing Wildix webhook event: ${error instanceof Error ? error.message : String(error)}`,
      );

      return { success: false };
    }
  }
}
