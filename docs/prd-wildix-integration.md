# PRD: Wildix x-bees Phone Call Integration

## Overview

Integrate Wildix x-bees telephony system with Twenty CRM to surface phone call activity in the customer lifecycle timeline. When a call is made or received through Wildix, it should automatically appear on the relevant Person/Company record in Twenty, including call direction, duration, recording link, transcript, and AI-generated summary.

## Background

- **Wildix x-bees** is our business telephony platform (deployed 2026-02-20)
- **Twenty CRM** is our open-source CRM (fork of twentyhq/twenty)
- Currently there is no visibility into call activity within the CRM — sales/support teams must manually log calls
- The integration bridges this gap by automatically capturing call events via Wildix webhooks

## Goals

1. **Automatic call logging**: Every inbound/outbound/internal call appears in Twenty CRM
2. **Timeline visibility**: Calls show on Person and Company timeline views
3. **Contact resolution**: Match incoming phone numbers to existing CRM contacts
4. **Transcript capture**: Store real-time transcription segments from Wildix
5. **AI summaries**: Generate one-line call summaries for quick scanning

## Non-Goals (v1)

- Click-to-call from Twenty UI (future phase)
- Call routing/IVR configuration from CRM
- Real-time call status display (live dashboard)
- Voicemail file storage (only metadata)

## Architecture

### Data Model

Following Twenty's Note/Task standard object pattern:

**PhoneCall** (standard workspace entity)
- `title` (TEXT) — auto-generated: "{direction} call with {contact}"
- `direction` (SELECT) — INBOUND / OUTBOUND / INTERNAL
- `callStatus` (SELECT) — ANSWERED / MISSED / VOICEMAIL / IN_PROGRESS
- `callerPhone` (TEXT) — caller phone number
- `callerName` (TEXT) — caller name from Wildix
- `receiverPhone` (TEXT) — destination phone number
- `agentName` (TEXT) — internal agent who handled
- `startedAt` (DATE_TIME) — call start time
- `endedAt` (DATE_TIME) — call end time
- `durationSeconds` (NUMBER) — talk time in seconds
- `waitSeconds` (NUMBER) — queue/wait time in seconds
- `endCause` (TEXT) — termination reason
- `recordingUrl` (TEXT) — link to recording file
- `transcript` (RICH_TEXT_V2) — full transcript
- `summary` (TEXT) — AI-generated one-line summary
- `wildixCallId` (TEXT) — external ID for idempotency
- `bodyV2` (RICH_TEXT_V2) — notes/comments about the call
- `position` (NUMBER) — standard ordering field
- `createdBy` / `updatedBy` (ACTOR) — standard audit fields
- `phoneCallTargets` (ONE_TO_MANY → PhoneCallTarget)
- `attachments` (ONE_TO_MANY → Attachment)
- `timelineActivities` (ONE_TO_MANY → TimelineActivity)
- `favorites` (ONE_TO_MANY → Favorite)

**PhoneCallTarget** (junction entity, mirrors NoteTarget/TaskTarget)
- `phoneCall` (MANY_TO_ONE → PhoneCall)
- `targetPerson` (MANY_TO_ONE → Person)
- `targetCompany` (MANY_TO_ONE → Company)
- `targetOpportunity` (MANY_TO_ONE → Opportunity)
- `custom` (morph relation for custom objects)

### Webhook Flow

```
Wildix PBX → POST /webhooks/wildix/callback → WildixWebhookController
  ↓
Validate x-signature header
  ↓
Parse event type (call:live:progress | call:live:completed | call:live:transcription)
  ↓
For call:live:progress (call.start):
  1. Create PhoneCall record with status=IN_PROGRESS
  2. Resolve phone → Person/Company via phone field search
  3. Create PhoneCallTarget linking call to contact
  ↓
For call:live:transcription:
  1. Find existing PhoneCall by wildixCallId
  2. Append transcript segment
  ↓
For call:live:completed:
  1. Update PhoneCall with duration, endCause, status
  2. Trigger AI summary generation (if transcript exists)
```

### Phone Number Resolution

1. Normalize incoming phone: strip non-digits, remove leading country code
2. Query Twenty GraphQL for Person where `phones` contains normalized number
3. If no Person match, query Company phone fields
4. If no match, create PhoneCall unlinked (can be manually assigned later)

### Timeline Integration

PhoneCall and PhoneCallTarget are registered in:
- `SYSTEM_OBJECTS_WITH_TIMELINE_ACTIVITIES` constant
- `TimelineActivityService.targetObjects` map
- `CoreObjectNameSingular` enum
- `EventRowDynamicComponent` switch statement (frontend)

Timeline entries appear as:
```
🔽 Sarah linked a phone call with John Smith
   📞 Inbound — 4 min 32 sec — Answered
   "Customer called about renewal quote..."
```

## Implementation Plan

### Phase 1: Backend Data Model
- [ ] Add PhoneCall/PhoneCallTarget UUIDs to `standard-object.constant.ts`
- [ ] Create `phone-call.workspace-entity.ts`
- [ ] Create `phone-call-target.workspace-entity.ts`
- [ ] Create query hooks (delete/restore cascading)
- [ ] Register in `workspace-query-hook.module.ts`
- [ ] Add to `SYSTEM_OBJECTS_WITH_TIMELINE_ACTIVITIES`
- [ ] Extend `TimelineActivityService` with `'phoneCall'` activity type
- [ ] Add `CoreObjectNameSingular.PhoneCall` / `.PhoneCallTarget`

### Phase 2: Wildix Webhook Receiver
- [ ] Create `WildixWebhookController` (NestJS controller)
- [ ] Create `WildixWebhookService` (signature validation, event parsing)
- [ ] Create `WildixCallProcessorService` (phone resolution, record creation)
- [ ] Register `WildixModule` in core engine
- [ ] Store x-bees API key in environment config

### Phase 3: Frontend Timeline Component
- [ ] Create `EventRowPhoneCall` component
- [ ] Create `EventCardPhoneCall` detail card
- [ ] Register in `EventRowDynamicComponent` switch
- [ ] Add phone call icons (direction arrows + phone icon)

### Phase 4: Testing & Deployment
- [ ] Unit tests for webhook processing
- [ ] Unit tests for phone number resolution
- [ ] Integration test for full webhook → timeline flow
- [ ] Store WILDIX_API_KEY in Railway env vars
- [ ] Push to git, verify Railway build
- [ ] Configure Wildix webhook URL pointing to production

## Configuration

### Environment Variables
- `WILDIX_API_KEY` — x-bees API key for enrichment calls
- `WILDIX_WEBHOOK_SECRET` — (optional) shared secret for signature validation

### Wildix Webhook Setup
- URL: `https://<twenty-domain>/webhooks/wildix/callback`
- Events: `call:live:progress`, `call:live:completed`, `call:live:transcription`
- Method: POST with JSON payload
- Security: Validate `x-signature` header

## Success Metrics

- 100% of Wildix calls appear in Twenty within 30 seconds
- Phone number resolution matches >90% of calls to existing contacts
- Timeline renders call entries with correct direction/duration
- No duplicate call records (wildixCallId idempotency)

## Risks

- **Phone number format mismatch**: Mitigated by aggressive normalization
- **High webhook volume**: Twenty's workflow engine handles async processing via BullMQ
- **Wildix API changes**: Dedicated controller isolates vendor logic
- **Transcript size**: Rich text field handles large transcripts; consider truncation for very long calls
