import { WildixWebhookService } from 'src/modules/wildix/services/wildix-webhook.service';

// WildixWebhookService.parseEvent has no injected dependencies, so it can be
// instantiated directly — no NestJS TestingModule setup is required.

describe('WildixWebhookService.parseEvent', () => {
  let service: WildixWebhookService;

  // Minimal LOCAL caller participant
  const localCallee = {
    type: 'LOCAL',
    phone: '101',
    name: 'Agent Smith',
    email: 'agent@example.com',
    userExtension: '101',
  };

  // Minimal REMOTE caller participant
  const remoteCaller = {
    type: 'REMOTE',
    phone: '+393487432338',
    name: 'Mario Rossi',
  };

  // Minimal LOCAL caller participant (for OUTBOUND)
  const localCaller = {
    type: 'LOCAL',
    phone: '101',
    name: 'Agent Smith',
    email: 'agent@example.com',
    userExtension: '101',
  };

  // Minimal REMOTE callee (for OUTBOUND)
  const remoteCallee = {
    type: 'REMOTE',
    phone: '+33612345678',
    name: 'Jean Dupont',
  };

  beforeEach(() => {
    service = new WildixWebhookService();
  });

  describe('call ID extraction', () => {
    it('should extract callId from body.data.id, not body.id', () => {
      const body = {
        id: 'event-uuid-abc123', // envelope-level event UUID — must NOT be used as call ID
        type: 'call:live:progress',
        data: {
          id: 'ee_ee012844_1771782181.10014', // actual call ID (contains underscore)
          direction: 'INBOUND',
          caller: remoteCaller,
          callee: localCallee,
        },
      };

      const event = service.parseEvent(body);

      expect(event).not.toBeNull();
      expect(event?.callId).toBe('ee_ee012844_1771782181.10014');
      expect(event?.callId).not.toBe('event-uuid-abc123');
    });

    it('should fall back to data.callId when data.id does not contain underscore', () => {
      const body = {
        id: 'event-uuid-abc123',
        type: 'call:live:progress',
        data: {
          id: 'nodash',
          callId: 'fallback-call-id',
          direction: 'INBOUND',
          caller: remoteCaller,
          callee: localCallee,
        },
      };

      const event = service.parseEvent(body);

      expect(event).not.toBeNull();
      expect(event?.callId).toBe('fallback-call-id');
    });
  });

  describe('timestamp conversion', () => {
    it('should convert Unix millisecond timestamps to Date objects', () => {
      const startMs = 1700000000000; // 2023-11-14T22:13:20.000Z
      const endMs = 1700000060000; // 60 seconds later

      const body = {
        type: 'call:live:completed',
        data: {
          id: 'ee_ee012844_1771782181.10014',
          direction: 'INBOUND',
          startTime: startMs,
          endTime: endMs,
          caller: remoteCaller,
          callee: localCallee,
        },
      };

      const event = service.parseEvent(body);

      expect(event).not.toBeNull();
      expect(event?.startedAt).toBeInstanceOf(Date);
      expect(event?.endedAt).toBeInstanceOf(Date);
      expect(event?.startedAt?.getTime()).toBe(startMs);
      expect(event?.endedAt?.getTime()).toBe(endMs);
    });

    it('should leave startedAt and endedAt undefined when timestamps are absent', () => {
      const body = {
        type: 'call:live:progress',
        data: {
          id: 'ee_ee012844_1771782181.10014',
          direction: 'INBOUND',
          caller: remoteCaller,
          callee: localCallee,
        },
      };

      const event = service.parseEvent(body);

      expect(event).not.toBeNull();
      expect(event?.startedAt).toBeUndefined();
      expect(event?.endedAt).toBeUndefined();
    });
  });

  describe('direction detection', () => {
    it('should identify INBOUND direction when the callee is LOCAL', () => {
      const body = {
        type: 'call:live:progress',
        data: {
          id: 'ee_ee012844_1771782181.10014',
          direction: 'INBOUND',
          caller: remoteCaller, // REMOTE — the external party
          callee: localCallee, // LOCAL — the internal agent (callee)
        },
      };

      const event = service.parseEvent(body);

      expect(event).not.toBeNull();
      expect(event?.direction).toBe('INBOUND');
    });

    it('should set the agent to the LOCAL callee for INBOUND calls', () => {
      const body = {
        type: 'call:live:progress',
        data: {
          id: 'ee_ee012844_1771782181.10014',
          direction: 'INBOUND',
          caller: remoteCaller,
          callee: localCallee,
        },
      };

      const event = service.parseEvent(body);

      expect(event).not.toBeNull();
      expect(event?.agentName).toBe('Agent Smith');
    });

    it('should identify OUTBOUND direction when the caller is LOCAL', () => {
      const body = {
        type: 'call:live:progress',
        data: {
          id: 'ee_ee012844_1771782181.10014',
          direction: 'OUTBOUND',
          caller: localCaller, // LOCAL — the internal agent (caller)
          callee: remoteCallee, // REMOTE — the external party
        },
      };

      const event = service.parseEvent(body);

      expect(event).not.toBeNull();
      expect(event?.direction).toBe('OUTBOUND');
    });

    it('should set the agent to the LOCAL caller for OUTBOUND calls', () => {
      const body = {
        type: 'call:live:progress',
        data: {
          id: 'ee_ee012844_1771782181.10014',
          direction: 'OUTBOUND',
          caller: localCaller,
          callee: remoteCallee,
        },
      };

      const event = service.parseEvent(body);

      expect(event).not.toBeNull();
      expect(event?.agentName).toBe('Agent Smith');
    });

    it('should normalise INCOMING direction string to INBOUND', () => {
      const body = {
        type: 'call:live:progress',
        data: {
          id: 'ee_ee012844_1771782181.10014',
          direction: 'INCOMING',
          caller: remoteCaller,
          callee: localCallee,
        },
      };

      const event = service.parseEvent(body);

      expect(event?.direction).toBe('INBOUND');
    });

    it('should normalise OUTGOING direction string to OUTBOUND', () => {
      const body = {
        type: 'call:live:progress',
        data: {
          id: 'ee_ee012844_1771782181.10014',
          direction: 'OUTGOING',
          caller: localCaller,
          callee: remoteCallee,
        },
      };

      const event = service.parseEvent(body);

      expect(event?.direction).toBe('OUTBOUND');
    });
  });

  describe('voicemail detection', () => {
    it('should detect voicemail when flags array contains "voicemail"', () => {
      const body = {
        type: 'call:live:completed',
        data: {
          id: 'ee_ee012844_1771782181.10014',
          direction: 'INBOUND',
          flags: ['voicemail'],
          caller: remoteCaller,
          callee: localCallee,
        },
      };

      const event = service.parseEvent(body);

      expect(event).not.toBeNull();
      expect(event?.isVoicemail).toBe(true);
      expect(event?.status).toBe('VOICEMAIL');
    });

    it('should not flag as voicemail when flags array is empty', () => {
      const body = {
        type: 'call:live:completed',
        data: {
          id: 'ee_ee012844_1771782181.10014',
          direction: 'INBOUND',
          flags: [],
          talkTime: 30000,
          caller: remoteCaller,
          callee: localCallee,
        },
      };

      const event = service.parseEvent(body);

      expect(event).not.toBeNull();
      expect(event?.isVoicemail).toBe(false);
    });

    it('should detect voicemail via endCause field when flags are absent', () => {
      const body = {
        type: 'call:live:completed',
        data: {
          id: 'ee_ee012844_1771782181.10014',
          direction: 'INBOUND',
          endCause: 'voicemail_answered',
          caller: remoteCaller,
          callee: localCallee,
        },
      };

      const event = service.parseEvent(body);

      expect(event).not.toBeNull();
      expect(event?.isVoicemail).toBe(true);
    });
  });

  describe('unknown event type', () => {
    it('should return null for an unrecognised event type', () => {
      const body = {
        type: 'call:unknown:event',
        data: {
          id: 'ee_ee012844_1771782181.10014',
          direction: 'INBOUND',
          caller: remoteCaller,
          callee: localCallee,
        },
      };

      const result = service.parseEvent(body);

      expect(result).toBeNull();
    });

    it('should return null when neither type nor event field is present', () => {
      const body = {
        data: {
          id: 'ee_ee012844_1771782181.10014',
          direction: 'INBOUND',
          caller: remoteCaller,
          callee: localCallee,
        },
      };

      const result = service.parseEvent(body);

      expect(result).toBeNull();
    });
  });

  describe('event type resolution', () => {
    it('should resolve type "call:live:progress" to progress eventType', () => {
      const body = {
        type: 'call:live:progress',
        data: {
          id: 'ee_ee012844_1771782181.10014',
          direction: 'INBOUND',
          caller: remoteCaller,
          callee: localCallee,
        },
      };

      const event = service.parseEvent(body);

      expect(event).not.toBeNull();
      expect(event?.eventType).toBe('call:live:progress');
      expect(event?.status).toBe('IN_PROGRESS');
    });

    it('should resolve type "call:live:completed" to completed eventType', () => {
      const body = {
        type: 'call:live:completed',
        data: {
          id: 'ee_ee012844_1771782181.10014',
          direction: 'INBOUND',
          talkTime: 45000,
          caller: remoteCaller,
          callee: localCallee,
        },
      };

      const event = service.parseEvent(body);

      expect(event).not.toBeNull();
      expect(event?.eventType).toBe('call:live:completed');
      expect(event?.status).toBe('ANSWERED');
    });

    it('should resolve data.trigger "call.start" to progress eventType', () => {
      const body = {
        type: 'some_generic_event',
        data: {
          id: 'ee_ee012844_1771782181.10014',
          trigger: 'call.start',
          direction: 'OUTBOUND',
          caller: localCaller,
          callee: remoteCallee,
        },
      };

      const event = service.parseEvent(body);

      expect(event).not.toBeNull();
      expect(event?.eventType).toBe('call:live:progress');
    });

    it('should resolve data.trigger "call.end" to completed eventType', () => {
      const body = {
        type: 'some_generic_event',
        data: {
          id: 'ee_ee012844_1771782181.10014',
          trigger: 'call.end',
          direction: 'OUTBOUND',
          talkTime: 10000,
          caller: localCaller,
          callee: remoteCallee,
        },
      };

      const event = service.parseEvent(body);

      expect(event).not.toBeNull();
      expect(event?.eventType).toBe('call:live:completed');
    });
  });
});
