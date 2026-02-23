import { Injectable, Logger } from '@nestjs/common';

import { createHmac } from 'crypto';

import { isDefined } from 'twenty-shared/utils';

import {
  type WildixCallEvent,
  type WildixCallRecord,
  type WildixEventType,
  type WildixParticipant,
  type WildixWebhookEnvelope,
} from 'src/modules/wildix/types/wildix-webhook-payload.type';

@Injectable()
export class WildixWebhookService {
  protected readonly logger = new Logger(WildixWebhookService.name);

  // Validate HMAC-SHA256 signature from Wildix
  validateSignature(
    rawBody: string,
    signature: string | undefined,
    secret: string,
  ): boolean {
    if (!isDefined(signature) || !isDefined(secret) || secret === '') {
      return true; // Skip validation if not configured
    }

    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');

    return expected === signature;
  }

  // Parse a Wildix webhook POST body into a normalized WildixCallEvent
  parseEvent(body: Record<string, unknown>): WildixCallEvent | null {
    // Wildix webhook envelope: { id, type, data: { ...callData } }
    // The top-level `type` or `event` field is the event type
    // The actual call data lives in `body.data`
    const envelope = body as WildixWebhookEnvelope;

    const eventType = this.resolveEventType(envelope);

    if (!eventType) {
      return null;
    }

    // Unwrap the call data from the envelope
    const data =
      isDefined(envelope.data) && typeof envelope.data === 'object'
        ? (envelope.data as Record<string, unknown>)
        : body; // Fallback: some integrations send flat payloads

    return this.parseCallData(data, eventType, body);
  }

  // Parse a WDA History API CallRecord into a WildixCallEvent (for polling/backfill)
  parseHistoryRecord(record: WildixCallRecord): WildixCallEvent {
    const direction = this.normalizeDirection(record.direction);
    const isVoicemail =
      Array.isArray(record.flags) && record.flags.includes('voicemail');

    const status = this.resolveStatusFromHistory(
      record.callStatus,
      record.talkTime,
      isVoicemail,
    );

    const { agent, remoteParticipant } = this.identifyParticipants(
      record.caller,
      record.callee,
      direction,
    );

    const recordingUrl =
      record.attachments?.find((a) => isDefined(a.recording))?.recording?.url ??
      '';

    return {
      eventType: 'call:live:completed',
      callId: record.id,
      flowIndex: record.flowIndex ?? 0,
      direction,
      status,
      isVoicemail,
      caller: record.caller ?? null,
      callee: record.callee ?? null,
      remotePhone: record.remotePhone ?? remoteParticipant?.phone ?? '',
      remoteName: remoteParticipant?.name ?? record.remotePhone ?? '',
      agentName: agent?.name ?? '',
      agentEmail: agent?.email ?? '',
      agentExtension: agent?.userExtension ?? '',
      startedAt: record.startTime
        ? new Date(Number(record.startTime))
        : undefined,
      endedAt: record.endTime ? new Date(Number(record.endTime)) : undefined,
      durationSeconds: Math.round((record.talkTime ?? 0) / 1000),
      waitSeconds: Math.round(
        ((record.connectTime ?? 0) +
          (record.waitTime ?? 0) +
          (record.queueTime ?? 0)) /
          1000,
      ),
      holdSeconds: Math.round((record.holdTime ?? 0) / 1000),
      endCause: '',
      recordingUrl,
      rawPayload: record as unknown as Record<string, unknown>,
    };
  }

  private parseCallData(
    data: Record<string, unknown>,
    eventType: WildixEventType,
    rawBody: Record<string, unknown>,
  ): WildixCallEvent {
    const direction = this.resolveDirection(data);
    const isVoicemail = this.resolveIsVoicemail(data);

    const caller = this.parseParticipant(
      data.caller as Record<string, unknown> | undefined,
    );
    const callee = this.parseParticipant(
      data.callee as Record<string, unknown> | undefined,
    );

    const { agent, remoteParticipant } = this.identifyParticipants(
      caller,
      callee,
      direction,
    );

    const talkTime = Number(data.talkTime ?? 0);
    const status = this.resolveStatus(data, eventType, talkTime, isVoicemail);

    // Extract recording URL from attachments array (preferred) or legacy field
    const attachments = Array.isArray(data.attachments)
      ? (data.attachments as Array<Record<string, unknown>>)
      : [];

    const recordingUrl =
      (
        attachments.find((a) => isDefined(a.recording)) as
          | Record<string, Record<string, string>>
          | undefined
      )?.recording?.url ?? String(data.recordingFile ?? data.recording ?? '');

    return {
      eventType,
      callId: this.resolveCallId(data, rawBody),
      flowIndex: Number(data.flowIndex ?? 0),
      direction,
      status,
      isVoicemail,
      caller,
      callee,
      remotePhone:
        String(data.remotePhone ?? '') || remoteParticipant?.phone || '',
      remoteName: remoteParticipant?.name ?? '',
      agentName: agent?.name ?? String(data.agentName ?? data.userName ?? ''),
      agentEmail: agent?.email ?? '',
      agentExtension: agent?.userExtension ?? '',
      startedAt:
        data.startTime != null ? new Date(Number(data.startTime)) : undefined,
      endedAt:
        data.endTime != null ? new Date(Number(data.endTime)) : undefined,
      durationSeconds: Math.round(talkTime / 1000),
      waitSeconds: Math.round(
        (Number(data.waitTime ?? 0) + Number(data.queueTime ?? 0)) / 1000,
      ),
      holdSeconds: Math.round(Number(data.holdTime ?? 0) / 1000),
      endCause: String(data.endCause ?? ''),
      recordingUrl,
      transcriptSegment: data.text != null ? String(data.text) : undefined,
      transcriptSpeaker:
        data.speaker != null ? String(data.speaker) : undefined,
      transcriptLanguage:
        data.language != null ? String(data.language) : undefined,
      rawPayload: rawBody,
    };
  }

  private parseParticipant(
    raw: Record<string, unknown> | undefined,
  ): WildixParticipant | null {
    if (!isDefined(raw) || typeof raw !== 'object') {
      return null;
    }

    return {
      type: (raw.type as 'LOCAL' | 'REMOTE') ?? 'REMOTE',
      role: raw.role != null ? String(raw.role) : undefined,
      phone: String(raw.phone ?? ''),
      name: String(raw.name ?? ''),
      email: raw.email != null ? String(raw.email) : undefined,
      userId: raw.userId != null ? String(raw.userId) : undefined,
      userExtension:
        raw.userExtension != null ? String(raw.userExtension) : undefined,
      userDepartment:
        raw.userDepartment != null ? String(raw.userDepartment) : undefined,
      groupId: raw.groupId != null ? String(raw.groupId) : undefined,
      groupName: raw.groupName != null ? String(raw.groupName) : undefined,
      userDevice: raw.userDevice != null ? String(raw.userDevice) : undefined,
      license: raw.license != null ? String(raw.license) : undefined,
    };
  }

  // For INBOUND: agent = callee (LOCAL), remote = caller
  // For OUTBOUND: agent = caller (LOCAL), remote = callee
  private identifyParticipants(
    caller: WildixParticipant | null,
    callee: WildixParticipant | null,
    direction: 'INBOUND' | 'OUTBOUND' | 'INTERNAL' | 'UNKNOWN',
  ): {
    agent: WildixParticipant | null;
    remoteParticipant: WildixParticipant | null;
  } {
    if (direction === 'INBOUND') {
      const agent =
        callee?.type === 'LOCAL'
          ? callee
          : caller?.type === 'LOCAL'
            ? caller
            : callee;
      const remoteParticipant = caller?.type === 'REMOTE' ? caller : callee;

      return {
        agent: agent ?? null,
        remoteParticipant: remoteParticipant ?? null,
      };
    }

    if (direction === 'OUTBOUND') {
      const agent =
        caller?.type === 'LOCAL'
          ? caller
          : callee?.type === 'LOCAL'
            ? callee
            : caller;
      const remoteParticipant = callee?.type === 'REMOTE' ? callee : caller;

      return {
        agent: agent ?? null,
        remoteParticipant: remoteParticipant ?? null,
      };
    }

    // INTERNAL or UNKNOWN: prefer the callee as agent
    return {
      agent: callee ?? caller,
      remoteParticipant: caller,
    };
  }

  // Call ID lives in data.id, NOT in the envelope's id (which is the event UUID)
  private resolveCallId(
    data: Record<string, unknown>,
    envelope: Record<string, unknown>,
  ): string {
    // data.id is the actual call ID (ee_ee012844_1771782181.10014)
    if (isDefined(data.id) && String(data.id).includes('_')) {
      return String(data.id);
    }

    // Fallback to explicit callId field
    if (isDefined(data.callId)) {
      return String(data.callId);
    }

    // Last resort: envelope top-level id (may be event UUID for some webhook types)
    return String(envelope.id ?? envelope.callId ?? '');
  }

  private resolveEventType(
    envelope: WildixWebhookEnvelope,
  ): WildixEventType | null {
    const eventStr = String(
      envelope.type ?? envelope.event ?? '',
    ).toLowerCase();

    if (
      eventStr.includes('progress') ||
      eventStr.includes('call:live:progress')
    ) {
      return 'call:live:progress';
    }

    if (
      eventStr.includes('completed') ||
      eventStr.includes('call:live:completed')
    ) {
      return 'call:live:completed';
    }

    if (
      eventStr.includes('transcription') ||
      eventStr.includes('call:live:transcription')
    ) {
      return 'call:live:transcription';
    }

    // Check data.trigger for progress sub-events
    const trigger = String(
      (envelope.data as Record<string, unknown> | undefined)?.trigger ?? '',
    );

    if (trigger === 'call.start' || trigger === 'call.update') {
      return 'call:live:progress';
    }

    if (trigger === 'call.end') {
      return 'call:live:completed';
    }

    return null;
  }

  private normalizeDirection(
    direction: string,
  ): 'INBOUND' | 'OUTBOUND' | 'INTERNAL' | 'UNKNOWN' {
    const upper = String(direction ?? '').toUpperCase();

    if (upper === 'INBOUND' || upper === 'INCOMING') {
      return 'INBOUND';
    }

    if (upper === 'OUTBOUND' || upper === 'OUTGOING') {
      return 'OUTBOUND';
    }

    if (upper === 'INTERNAL') {
      return 'INTERNAL';
    }

    return 'UNKNOWN';
  }

  private resolveDirection(
    data: Record<string, unknown>,
  ): 'INBOUND' | 'OUTBOUND' | 'INTERNAL' | 'UNKNOWN' {
    return this.normalizeDirection(String(data.direction ?? ''));
  }

  private resolveIsVoicemail(data: Record<string, unknown>): boolean {
    // Check flags array (canonical Wildix indicator)
    if (Array.isArray(data.flags) && data.flags.includes('voicemail')) {
      return true;
    }

    // Check endCause / attachmentType fallback
    const endCause = String(data.endCause ?? '').toLowerCase();
    const attachmentType = String(data.attachmentType ?? '').toLowerCase();

    return endCause.includes('voicemail') || attachmentType === 'voicemail';
  }

  private resolveStatusFromHistory(
    callStatus: string,
    talkTime: number,
    isVoicemail: boolean,
  ): 'IN_PROGRESS' | 'ANSWERED' | 'MISSED' | 'VOICEMAIL' {
    if (isVoicemail) {
      return 'VOICEMAIL';
    }

    if (callStatus === 'MISSED') {
      return 'MISSED';
    }

    if (callStatus === 'COMPLETED' && talkTime > 0) {
      return 'ANSWERED';
    }

    return 'MISSED';
  }

  private resolveStatus(
    data: Record<string, unknown>,
    eventType: WildixEventType,
    talkTime: number,
    isVoicemail: boolean,
  ): 'IN_PROGRESS' | 'ANSWERED' | 'MISSED' | 'VOICEMAIL' {
    if (eventType === 'call:live:progress') {
      return 'IN_PROGRESS';
    }

    if (isVoicemail) {
      return 'VOICEMAIL';
    }

    const status = String(data.status ?? data.callStatus ?? '').toUpperCase();
    const endCause = String(data.endCause ?? '').toLowerCase();

    if (status === 'MISSED' || endCause.includes('no answer')) {
      return 'MISSED';
    }

    if (
      status === 'COMPLETED' ||
      status === 'ANSWERED' ||
      endCause.includes('normal clearing') ||
      talkTime > 0
    ) {
      return 'ANSWERED';
    }

    return 'MISSED';
  }
}
