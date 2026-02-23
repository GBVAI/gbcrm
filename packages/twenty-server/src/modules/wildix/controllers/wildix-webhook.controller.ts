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

import { isDefined } from 'twenty-shared/utils';

import { TwentyConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';
import { NoPermissionGuard } from 'src/engine/guards/no-permission.guard';
import { PublicEndpointGuard } from 'src/engine/guards/public-endpoint.guard';
import { WildixCallProcessorService } from 'src/modules/wildix/services/wildix-call-processor.service';
import { WildixWebhookService } from 'src/modules/wildix/services/wildix-webhook.service';

@Controller('webhooks/wildix')
@UseGuards(PublicEndpointGuard, NoPermissionGuard)
export class WildixWebhookController {
  protected readonly logger = new Logger(WildixWebhookController.name);

  constructor(
    private readonly wildixWebhookService: WildixWebhookService,
    private readonly wildixCallProcessorService: WildixCallProcessorService,
    private readonly twentyConfigService: TwentyConfigService,
  ) {}

  @Post('callback')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Body() body: Record<string, unknown>,
    @Headers('x-signature') signature: string | undefined,
  ): Promise<{ success: boolean }> {
    this.logger.log(
      `Received Wildix webhook: type=${String(body.type ?? body.event ?? 'unknown')}`,
    );

    // Validate webhook signature if secret is configured
    const webhookSecret = this.twentyConfigService.get('WILDIX_WEBHOOK_SECRET');

    if (isDefined(webhookSecret) && webhookSecret !== '') {
      const isValid = this.wildixWebhookService.validateSignature(
        JSON.stringify(body),
        signature,
        webhookSecret,
      );

      if (!isValid) {
        this.logger.warn('Wildix webhook signature validation failed');

        return { success: false };
      }
    }

    const event = this.wildixWebhookService.parseEvent(body);

    if (!isDefined(event)) {
      // Return 200 for unknown event types so Wildix doesn't retry indefinitely
      this.logger.log(
        `Ignoring unrecognized event type: ${String(body.type ?? body.event ?? 'unknown')}`,
      );

      return { success: true };
    }

    try {
      await this.wildixCallProcessorService.processCallEvent(event);

      return { success: true };
    } catch (error) {
      this.logger.error(
        `Error processing Wildix webhook: ${error instanceof Error ? error.message : String(error)}`,
      );

      return { success: false };
    }
  }
}
