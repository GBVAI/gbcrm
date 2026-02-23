export type WildixEventType =
  | 'call:live:progress'
  | 'call:live:completed'
  | 'call:live:transcription';

// Matches the CallParticipant schema from the Wildix WDA History API
export type WildixParticipant = {
  type: 'LOCAL' | 'REMOTE';
  role?: string;
  phone: string;
  name: string;
  email?: string;
  userId?: string;
  userExtension?: string;
  userDepartment?: string;
  groupId?: string;
  groupName?: string;
  userDevice?: string;
  license?: string;
};

// Normalized call event after parsing either webhook payload or WDA History API response
export type WildixCallEvent = {
  eventType: WildixEventType;

  // Unique call identifier — format: ee_ee012844_1771782181.10014
  callId: string;
  flowIndex: number;

  // Call metadata
  direction: 'INBOUND' | 'OUTBOUND' | 'INTERNAL' | 'UNKNOWN';
  status: 'IN_PROGRESS' | 'ANSWERED' | 'MISSED' | 'VOICEMAIL';
  isVoicemail: boolean;

  // Participants (raw from API)
  caller: WildixParticipant | null;
  callee: WildixParticipant | null;

  // Derived convenience fields
  // For INBOUND: remotePhone = caller.phone (the external number)
  // For OUTBOUND: remotePhone = callee.phone (the external number)
  remotePhone: string;
  remoteName: string;

  // The LOCAL participant (the internal agent)
  agentName: string;
  agentEmail: string;
  agentExtension: string;

  // Timing
  startedAt: Date | undefined;
  endedAt: Date | undefined;

  // Duration components (all in seconds)
  durationSeconds: number; // talkTime — actual conversation time
  waitSeconds: number; // connectTime + waitTime + queueTime
  holdSeconds: number;

  // Call outcome
  endCause: string;

  // Attachments (recording URL requires PBX Simple Token to download)
  recordingUrl: string;

  // Transcription
  transcriptSegment?: string;
  transcriptSpeaker?: string;
  transcriptLanguage?: string;

  // Raw payload for debugging
  rawPayload: Record<string, unknown>;
};

// Shape of the Wildix webhook envelope:
// { id, pbx, company, time, type, integrationId, data: { ...call fields... } }
export type WildixWebhookEnvelope = {
  id: string; // event UUID — NOT the call ID
  pbx?: string;
  company?: string;
  time?: number;
  type?: string;
  event?: string;
  integrationId?: string;
  data?: Record<string, unknown>;
};

// Shape of a CallRecord from WDA History API (for polling/backfill)
export type WildixCallRecord = {
  id: string;
  flowIndex: number;
  pbx: string;
  company: string;
  type: 'call';
  startTime: number; // Unix ms
  endTime: number; // Unix ms
  time: number;
  duration: number;
  talkTime: number;
  connectTime: number;
  waitTime: number;
  queueTime: number;
  holdTime: number;
  direction: string;
  callStatus: 'COMPLETED' | 'MISSED';
  caller: WildixParticipant;
  callee: WildixParticipant;
  remotePhone: string;
  destination: string;
  serviceNumber: string;
  service: string;
  transcriptionStatus: 'AVAILABLE' | 'POST_TRANSCRIPTION' | 'UNAVAILABLE';
  flags: string[];
  tags: string[];
  attachments: Array<{
    recording?: {
      url: string;
      fileName?: string;
      start?: number;
      end?: number;
    };
    voicemail?: {
      url: string;
      owner?: string;
      destinations?: Array<{ email: string }>;
    };
    fax?: { url: string; status?: string };
  }>;
};
