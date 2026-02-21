import { Injectable, Logger } from '@nestjs/common';

import { type WildixCallEvent } from 'src/modules/wildix/types/wildix-webhook-payload.type';

@Injectable()
export class WildixCallProcessorService {
  protected readonly logger = new Logger(WildixCallProcessorService.name);

  async processCallEvent(event: WildixCallEvent): Promise<void> {
    this.logger.log(
      `Processing ${event.eventType} for call ${event.callId} (${event.direction})`,
    );

    switch (event.eventType) {
      case 'call:live:progress':
        await this.handleCallProgress(event);
        break;
      case 'call:live:completed':
        await this.handleCallCompleted(event);
        break;
      case 'call:live:transcription':
        await this.handleTranscription(event);
        break;
    }
  }

  private async handleCallProgress(event: WildixCallEvent): Promise<void> {
    this.logger.log(
      `Call started: ${event.direction} call from ${event.callerPhone} to ${event.receiverPhone}`,
    );

    // TODO: Create PhoneCall record via workspace ORM
    // TODO: Resolve phone number to Person/Company
    // TODO: Create PhoneCallTarget linking call to contact
    // For now, log the event for debugging
    this.logger.log(
      `Call ${event.callId}: ${event.direction} | ${event.callerName || event.callerPhone} → ${event.receiverPhone} | Agent: ${event.agentName}`,
    );
  }

  private async handleCallCompleted(event: WildixCallEvent): Promise<void> {
    this.logger.log(
      `Call completed: ${event.callId} | Duration: ${event.durationSeconds}s | Status: ${event.status} | Cause: ${event.endCause}`,
    );

    // TODO: Update existing PhoneCall record with completion data
    // TODO: Trigger AI summary generation if transcript exists
    // For now, log the completion
    this.logger.log(
      `Call ${event.callId} finished: ${event.status} after ${event.durationSeconds}s`,
    );
  }

  private async handleTranscription(event: WildixCallEvent): Promise<void> {
    if (!event.transcriptSegment) {
      return;
    }

    this.logger.log(
      `Transcript for call ${event.callId}: [${event.transcriptSpeaker ?? 'unknown'}] ${event.transcriptSegment.substring(0, 100)}`,
    );

    // TODO: Find existing PhoneCall by wildixCallId
    // TODO: Append transcript segment to PhoneCall.transcript field
  }
}
