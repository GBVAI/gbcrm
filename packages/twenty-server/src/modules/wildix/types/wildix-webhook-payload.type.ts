export type WildixEventType =
  | 'call:live:progress'
  | 'call:live:completed'
  | 'call:live:transcription';

export type WildixCallEvent = {
  eventType: WildixEventType;
  callId: string;
  direction: string;
  status: string;
  callerPhone: string;
  callerName: string;
  receiverPhone: string;
  agentName: string;
  startedAt?: Date;
  endedAt?: Date;
  durationSeconds: number;
  waitSeconds: number;
  endCause: string;
  recordingFile: string;
  transcriptSegment?: string;
  transcriptSpeaker?: string;
  transcriptLanguage?: string;
  rawPayload: Record<string, unknown>;
};
