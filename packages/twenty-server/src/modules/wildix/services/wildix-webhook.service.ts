import { Injectable, Logger } from '@nestjs/common';

import {
  type WildixCallEvent,
  type WildixEventType,
} from 'src/modules/wildix/types/wildix-webhook-payload.type';

@Injectable()
export class WildixWebhookService {
  protected readonly logger = new Logger(WildixWebhookService.name);

  parseEvent(body: Record<string, unknown>): WildixCallEvent | null {
    const eventType = this.resolveEventType(body);

    if (!eventType) {
      return null;
    }

    return {
      eventType,
      callId: String(body.id ?? body.callId ?? ''),
      direction: this.resolveDirection(body),
      status: this.resolveStatus(body, eventType),
      callerPhone: String(body.callerPhone ?? body.from ?? ''),
      callerName: String(body.callerName ?? body.fromName ?? ''),
      receiverPhone: String(body.receiverPhone ?? body.to ?? ''),
      agentName: String(body.agentName ?? body.userName ?? ''),
      startedAt: body.startTime ? new Date(String(body.startTime)) : undefined,
      endedAt: body.endTime ? new Date(String(body.endTime)) : undefined,
      durationSeconds: Number(body.talkTime ?? body.duration ?? 0),
      waitSeconds: Number(body.waitTime ?? 0) + Number(body.queueTime ?? 0),
      endCause: String(body.endCause ?? ''),
      recordingFile: String(body.recordingFile ?? body.recording ?? ''),
      transcriptSegment: body.text ? String(body.text) : undefined,
      transcriptSpeaker: body.speaker ? String(body.speaker) : undefined,
      transcriptLanguage: body.language ? String(body.language) : undefined,
      rawPayload: body,
    };
  }

  private resolveEventType(
    body: Record<string, unknown>,
  ): WildixEventType | null {
    const event = String(body.event ?? body.type ?? '');

    if (
      event.includes('progress') ||
      event.includes('start') ||
      event === 'call:live:progress'
    ) {
      return 'call:live:progress';
    }

    if (
      event.includes('completed') ||
      event.includes('end') ||
      event === 'call:live:completed'
    ) {
      return 'call:live:completed';
    }

    if (
      event.includes('transcription') ||
      event === 'call:live:transcription'
    ) {
      return 'call:live:transcription';
    }

    // Check for trigger field used in progress events
    const trigger = String(body.trigger ?? '');

    if (trigger === 'call.start' || trigger === 'call.update') {
      return 'call:live:progress';
    }

    if (trigger === 'call.end') {
      return 'call:live:completed';
    }

    return null;
  }

  private resolveDirection(body: Record<string, unknown>): string {
    const direction = String(body.direction ?? '').toUpperCase();

    if (direction === 'INBOUND' || direction === 'INCOMING') {
      return 'INBOUND';
    }

    if (direction === 'OUTBOUND' || direction === 'OUTGOING') {
      return 'OUTBOUND';
    }

    if (direction === 'INTERNAL') {
      return 'INTERNAL';
    }

    return 'INBOUND';
  }

  private resolveStatus(
    body: Record<string, unknown>,
    eventType: WildixEventType,
  ): string {
    if (eventType === 'call:live:progress') {
      return 'IN_PROGRESS';
    }

    const status = String(body.status ?? body.callStatus ?? '').toUpperCase();
    const endCause = String(body.endCause ?? '').toLowerCase();

    if (endCause.includes('no answer') || status === 'MISSED') {
      return 'MISSED';
    }

    if (endCause.includes('voicemail') || status === 'VOICEMAIL') {
      return 'VOICEMAIL';
    }

    if (
      endCause.includes('normal') ||
      status === 'ANSWERED' ||
      Number(body.talkTime ?? 0) > 0
    ) {
      return 'ANSWERED';
    }

    return 'MISSED';
  }
}
