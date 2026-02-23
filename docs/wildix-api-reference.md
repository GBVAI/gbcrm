# Wildix WDA / x-bees API Reference

> Research date: 2026-02-22
> All endpoints verified with live API calls against company `ee_ee012844` / PBX `gbhotels.wildixin.com`

---

## Overview

Wildix exposes **three separate API services** for call records and analytics:

| Service | Base URL | Purpose |
|---|---|---|
| **x-bees Conversations API** | `https://api.x-bees.com/v2` | Real-time channel/message data, call events |
| **WDA History API** | `https://wda.wildix.com` | Historical call records, transcriptions |
| **CDS CA (Cloud Analytics) API** | `https://cds-ca.wildix.com` | Flat-file analytics, bulk CSV exports |

For CRM call log integration the **WDA History API** is the primary source. It provides structured call records with full participant details, timing metrics, and links to recordings/voicemails.

---

## Authentication

### API Key Format

Keys follow the pattern `wsk-v1-<100-char-token>`. The prefix `wsk-v1-` is always present.

### Authorization Header

All three APIs use the same Bearer token format:

```
Authorization: Bearer wsk-v1-<your-key>
```

### Creating API Keys

Keys are created in the x-bees admin portal. The key provided for this integration is:

```
wsk-v1-2MMHWqDNCmzRbVgNZerFieqYLHc6k0skT3cPHYVM0ICsjFJJqxkycqr4mlUkpv9TEsLrr6w8aHuTY2p9TJR3M7LDoy0FC
```

Reference: [How to Use API Key Authentication](https://docs.wildix.com/guides/2025/10/01/api-keys-auth-guide/)

### Important: PBX Simple Token (separate credential)

The PBX direct API (`https://gbhotels.wildixin.com/api/v1/PBX/`) uses a **different** authentication mechanism - a "Simple Token" generated inside WMS under `PBX → Integrations → Applications → Simple Token`. The `wsk-v1` key does **not** work for this endpoint. For recording downloads the PBX Simple Token is required.

---

## WDA History API

**Base URL:** `https://wda.wildix.com`
**SDK Package:** `@wildix/wda-history-client` (npm, version 1.2.14+)

### Endpoint Summary

| Method | Path | Description |
|---|---|---|
| `POST` | `/v2/history/conversations` | Query all call/conference records |
| `POST` | `/v2/history/user/calls` | Query calls for a specific PBX user |
| `GET` | `/v2/history/calls/{callId}/flows/{flowIndex}` | Get single call record |
| `PUT` | `/v2/history/calls/{callId}/flows/{flowIndex}` | Update call tags |
| `GET` | `/v2/history/calls/{callId}/flows/{flowIndex}/transcription` | Get transcription chunks |
| `GET` | `/v2/history/calls/{callId}/flows/{flowIndex}/transcription/text` | Get transcription as formatted text |
| `GET` | `/v2/history/chats/{chatId}` | Get chat record |
| `GET` | `/v2/history/chats/{chatId}/transcription` | Get chat transcription |
| `GET` | `/v2/history/chats/{chatId}/transcription/text` | Get chat transcription as text |
| `GET` | `/v2/history/conferences/{conferenceId}` | Get conference record |
| `GET` | `/v2/history/conferences/{conferenceId}/transcription` | Get conference transcription |
| `GET` | `/v2/history/conferences/{conferenceId}/transcription/text` | Get conference transcription as text |

---

### POST /v2/history/conversations

Returns paginated call and conference records across the entire company.

**Request body:**

```json
{
  "limit": 100,
  "offset": 0,
  "company": "ee_ee012844",
  "user": "9186639",
  "filter": {
    "from": "2026-02-01T00:00:00Z",
    "to": "2026-02-22T23:59:59Z",
    "direction": "INBOUND",
    "status": "COMPLETED",
    "flags": ["VOICEMAIL"],
    "hasAttachment": true,
    "search": "+391234567890",
    "tags": ["important"]
  }
}
```

**Parameters:**

| Field | Type | Required | Description |
|---|---|---|---|
| `limit` | integer | No | Max results per page (default: varies) |
| `offset` | integer | No | Pagination offset |
| `company` | string | No | Company ID (required for s2s auth) |
| `user` | string | No | PBX user ID (numeric string) |
| `filter.from` | ISO 8601 datetime | No | Start of date range |
| `filter.to` | ISO 8601 datetime | No | End of date range |
| `filter.direction` | `INBOUND` \| `OUTBOUND` \| `INTERNAL` | No | Call direction |
| `filter.status` | `COMPLETED` \| `MISSED` | No | Call outcome |
| `filter.flags` | `["VOICEMAIL", "FAX"]` | No | Filter by attachment type |
| `filter.hasAttachment` | boolean | No | Only return records with attachments |
| `filter.search` | string | No | Search by phone number or name |
| `filter.tags` | string[] | No | Filter by custom tags |

**Example request:**

```bash
curl -X POST "https://wda.wildix.com/v2/history/conversations" \
  -H "Authorization: Bearer wsk-v1-..." \
  -H "Content-Type: application/json" \
  -d '{
    "limit": 50,
    "offset": 0,
    "filter": {
      "from": "2026-02-01T00:00:00Z",
      "to": "2026-02-22T23:59:59Z"
    }
  }'
```

**Response:**

```json
{
  "conversations": [
    {
      "call": { ... }
    },
    {
      "conference": { ... }
    }
  ]
}
```

Each item in `conversations` is a union type - either `{ "call": CallRecord }` or `{ "conference": ConferenceRecord }`.

---

### POST /v2/history/user/calls

Returns calls for a specific PBX user. The `user` query parameter (PBX user ID) is **required**.

```bash
curl -X POST "https://wda.wildix.com/v2/history/user/calls?user=9186639" \
  -H "Authorization: Bearer wsk-v1-..." \
  -H "Content-Type: application/json" \
  -d '{
    "limit": 50,
    "offset": 0,
    "filter": {
      "from": "2026-02-01T00:00:00Z",
      "to": "2026-02-22T23:59:59Z",
      "userDirection": "INCOMING"
    }
  }'
```

Additional filter field:

| Field | Type | Description |
|---|---|---|
| `filter.userDirection` | `INCOMING` \| `OUTGOING` | Direction from the user's perspective |

**Response:**

```json
{
  "calls": [ ... ]
}
```

Returns an array of `CallRecord` objects directly.

---

### GET /v2/history/calls/{callId}/flows/{flowIndex}

Returns a single detailed call record.

- `callId`: The full call ID from the record, e.g. `ee_ee012844_1771782181.10014`
- `flowIndex`: The flow index (integer, typically `0` for the first leg)

Optional query param: `company=ee_ee012844`

**Example:**

```bash
curl "https://wda.wildix.com/v2/history/calls/ee_ee012844_1771782181.10014/flows/0" \
  -H "Authorization: Bearer wsk-v1-..."
```

**Response:**

```json
{
  "call": { ... CallRecord ... }
}
```

---

### CallRecord Schema

This is the core data object returned by all call history endpoints.

```typescript
interface CallRecord {
  // Identity
  id: string;                    // e.g. "ee_ee012844_1771782181.10014"
  flowIndex: number;             // Leg index, 0 for first leg
  pbx: string;                   // PBX serial, e.g. "22110001d072"
  company: string;               // e.g. "ee_ee012844"
  type: "call";

  // Timing (Unix milliseconds)
  startTime: number;             // When the call started ringing
  endTime: number;               // When the call ended
  time: number;                  // Record creation/completion time

  // Duration components (all in milliseconds for the detailed GetCall endpoint,
  // rounded to seconds in the QueryConversations response)
  duration: number;              // Total = connectTime + waitTime + queueTime + talkTime + holdTime
  talkTime: number;              // Time actually talking (after answer, excl. hold)
  connectTime: number;           // Ring time before answer
  waitTime: number;              // IVR/dialplan time before answer
  queueTime: number;             // Time spent waiting in queue
  holdTime: number;              // Time on hold after answering

  // Direction and status
  direction: "INBOUND" | "OUTBOUND" | "INTERNAL" | "UNDEFINED";
  callStatus: "COMPLETED" | "MISSED";

  // Participants
  caller: CallParticipant;
  callee: CallParticipant;

  // Destination / service info
  destination: string;           // Dialed number or extension
  serviceNumber: string;         // DID / trunk number
  service: string;               // Service name (e.g. "Booking")

  // Remote party details
  remotePhone: string;
  remotePhoneCountryCode: number;
  remotePhoneCountryCodeStr: string;   // e.g. "IT"
  remotePhoneLocation: string;

  // Trunk info
  trunkName: string;             // e.g. "classound"
  trunkDirection: string;        // "incoming" | "outgoing"

  // Queue info (if call went through a queue)
  queueName: string;
  queueId: string;

  // Recording and transcription
  transcriptionStatus: "AVAILABLE" | "POST_TRANSCRIPTION" | "UNAVAILABLE";
  transcriptionLanguage: string;
  transcriptionSeconds: number;

  // Attachments (use this instead of deprecated recordings/recordingsData fields)
  attachments: CallFlowAttachment[];  // Each item is one of: recording, voicemail, fax

  // Deprecated fields (still present but prefer attachments)
  recordings: string[];
  recordingsData: CallFlowRecording[];
  attachment: string;
  attachmentType: "FAX" | "VOICEMAIL";
  attachmentDestinations: CallFlowAttachmentDestination[];

  // Tags and flags
  tags: string[];
  flags: string[];               // e.g. ["voicemail"]

  // Audio quality
  callerMos: string;
  calleeMos: string;

  // License info
  licenses: ("uc" | "x-bees")[];

  // Call flow / transfer data
  mergeWith: string;
  splitReason: string;
  splitTransferType: string;

  // x-hoppers
  xhoppersConfId: string;
}
```

---

### CallParticipant Schema

```typescript
interface CallParticipant {
  type: "LOCAL" | "REMOTE";       // LOCAL = internal PBX user, REMOTE = external
  role: "AGENT" | "CLIENT";

  // Phone / identity
  phone: string;
  name: string;
  email: string;

  // PBX user details (only for LOCAL/internal participants)
  userId: string;                 // PBX user ID (numeric string)
  userExtension: string;          // PBX extension
  userDepartment: string;
  groupId: string;
  groupName: string;

  // Device info
  userAgent: string;              // e.g. "x-bees Android 2.51.1.462986"
  userDevice: "XBEES_ANDROID" | "XBEES_IOS" | "XBEES_WEB" |
              "WILDIX_PHONE" | "WILDIX_DEVICE" | "COLLABORATION_WEB" |
              "COLLABORATION_ANDROID" | "COLLABORATION_IOS" | "VOICEBOT" | "UNKNOWN";

  // License
  license: "uc" | "x-bees";

  // SIP details
  sipCallId: string;
  publicAddress: string;          // "123.45.67.89:59317"
  privateAddress: string;
  location: string;               // "lat=29.3008&lon=1.7002"

  // Geographic (for remote)
  company: string;
}
```

**Real example (INBOUND call - agent Francesca received a call from +39348...):**

```json
{
  "caller": {
    "name": "+393487432338",
    "phone": "+393487432338",
    "role": "CLIENT",
    "type": "REMOTE"
  },
  "callee": {
    "email": "francescagbviaggi@gmail.com",
    "groupId": "55776150",
    "groupName": "Default",
    "license": "business",
    "name": "Francesca Colombo",
    "phone": "212",
    "role": "AGENT",
    "sipCallId": "2f448e4165c773cb7ae7e77b39d3babf",
    "type": "LOCAL",
    "userAgent": "x-bees Android 2.51.1.462986 d9adebcba6ccec36",
    "userDepartment": "Booking",
    "userDevice": "XBEES_ANDROID",
    "userExtension": "212",
    "userId": "9186639"
  }
}
```

---

### CallFlowAttachment Schema

Attachments contain recordings, voicemails, or faxes. Use the `attachments` array on `CallRecord`.

```typescript
// Recording attachment
{
  "recording": {
    "fileName": "2026.02.22-14.30.00-212-393487432338-abc123-0.wav",
    "start": 1771782200000,   // Unix ms
    "end": 1771782460000,     // Unix ms
    "owner": "caller" | "callee" | "system",
    "url": "https://gbhotels.wildixin.com:443/spoolview/recordings/.../filename.wav",
    "pauses": [
      { "start": 1771782300000, "end": 1771782320000, "reason": "hold" | "pause" }
    ]
  }
}

// Voicemail attachment
{
  "voicemail": {
    "url": "https://gbhotels.wildixin.com:443/spoolview/voicemail/gmail.com/user/INBOX/msg1771790711-XXXX.mp3",
    "owner": "callee",
    "destinations": [
      { "email": "gbviaggi22@gmail.com" }
    ]
  }
}

// Fax attachment
{
  "fax": {
    "url": "https://...",
    "status": "ok" | "error",
    "owner": "callee",
    "destinations": [...],
    "error": "string (if failed)"
  }
}
```

**Important:** The recording/voicemail URLs point to `gbhotels.wildixin.com`. Downloading these requires a **PBX Simple Token** (not the `wsk-v1` key). Generate one in WMS under `PBX → Integrations → Applications → Simple Token`. Then use:

```
Authorization: Bearer <PBX_SIMPLE_TOKEN>
```

The URL may redirect (HTTP 302) to cloud storage. Follow redirects.

---

### GET /v2/history/calls/{callId}/flows/{flowIndex}/transcription

Returns the raw transcription chunks for a call.

**Response:**

```json
{
  "transcription": {
    "id": "ee_ee012844_1771782181.10014",
    "pbx": "22110001d072",
    "time": 1771782460000,
    "company": "ee_ee012844",
    "type": "call_transcription",
    "flowIndex": 0,
    "flowStartTime": 1771782181000,
    "callStartTime": 1771782181000,
    "chunks": [
      {
        "id": "chunk-uuid",
        "time": 1771782181000,
        "speaker": "caller" | "callee",
        "text": "Ciao, vorrei prenotare una camera...",
        "language": "it-IT",
        "isFinal": true,
        "start": 1500,       // ms from call start
        "end": 4200,
        "sentiment": "positive"
      }
    ]
  },
  "interaction": {
    "talkRatio": 45,
    "wordsPerMinute": 120,
    "interruptions": 3,
    "patience": 1.5,
    "longestMonologue": 45,
    "longestCustomerStory": 60,
    "participants": [...]
  }
}
```

Returns `404` if no transcription is available. Check `transcriptionStatus` on the `CallRecord` first:
- `AVAILABLE` - transcription exists, safe to request
- `POST_TRANSCRIPTION` - transcription is being processed (retry after a delay)
- `UNAVAILABLE` - no transcription for this call

**Retry logic:** After `call:completed` webhook, the transcription may not be immediately ready. Implement 3 retry attempts with delays.

---

### GET /v2/history/calls/{callId}/flows/{flowIndex}/transcription/text

Returns the transcription as formatted plain text (better for LLM/display use).

**Response:**

```json
{
  "filename": "transcription-ee_ee012844_1771782181.10014.txt",
  "text": "Francesca Colombo: Ciao, buongiorno...\nCaller: Salve, volevo...",
  "chunks": [
    {
      "id": "chunk-uuid",
      "name": "Francesca Colombo",
      "text": "Ciao, buongiorno",
      "time": "2026-02-22T14:30:05Z",
      "offset": 0
    }
  ]
}
```

---

### PUT /v2/history/calls/{callId}/flows/{flowIndex}

Update custom tags on a call record. Useful for CRM sync tracking.

**Request body:**

```json
{
  "tags": ["crm-synced", "ticket-123"]
}
```

**Response:** Returns the updated `CallRecord`.

---

## x-bees Conversations API

**Base URL:** `https://api.x-bees.com/v2`

This API manages real-time messaging channels. Each telephone conversation creates a "channel" and call events appear as messages within that channel. This is useful for tracking conversations in near-real-time.

### GET /v2/conversations/channels/

Returns the list of conversation channels (most recent first).

**Query parameters:**

| Parameter | Type | Description |
|---|---|---|
| `limit` | integer | Max results |
| `offset` | integer | Pagination offset |

**Example:**

```bash
curl "https://api.x-bees.com/v2/conversations/channels/?limit=50" \
  -H "Authorization: Bearer wsk-v1-..."
```

**Response:**

```json
{
  "channels": [
    {
      "channelId": "53f81e26-3934-8743-2338-1f4375ef",
      "channelType": "group",
      "company": "ee_ee012844",
      "subject": "+393487432338",
      "telephony": true,
      "external": true,
      "service": "1@gbhotels.wildixin.com:443",
      "serviceTitle": "Booking",
      "serviceRecipient": "+393487432338",
      "memberCount": 2,
      "access": "private",
      "createdAt": "2026-02-22T17:43:13.599837Z",
      "createdBy": "bvK6nGTDxZeU",
      "updatedAt": "2026-02-22T17:43:13.784417Z",
      "assignee": {
        "id": "HzkKaAFEC37K",
        "name": "Simone Ventura",
        "email": "simonegbviaggi@gmail.com",
        "pbxExtension": "201",
        "pbxUserId": "8994027",
        "pbxDomain": "gbhotels.wildixin.com",
        "pbxGroupId": "55776150"
      }
    }
  ]
}
```

**Key fields:**
- `channelId` - unique conversation identifier
- `serviceRecipient` - external phone number
- `telephony: true` - indicates this channel has telephony (calls)
- `createdBy` - x-bees user ID of the agent who initiated
- `assignee` - assigned agent with full user details including `pbxUserId`

### GET /v2/conversations/channels/{channelId}

Returns details for a single channel.

### GET /v2/conversations/channels/{channelId}/messages/

Returns messages in a channel, including call event messages.

**Call event messages** have the `event` field set to a JSON string:

```json
// Call started
{ "type": "call_started" }

// Call ended
{
  "type": "call_ended",
  "duration": 268,
  "call": {
    "id": "ee_ee012844_1771782181.10014",
    "flowIndex": 0,
    "company": "ee_ee012844",
    "transcription": false
  }
}

// Conversation created
{ "type": "conversation_created", "isPublic": false }
```

The `call.id` from `call_ended` can be used directly with the WDA History API to retrieve full call details.

---

## CDS CA (Cloud Analytics) API

**Base URL:** `https://cds-ca.wildix.com`
**SDK Package:** `@wildix/cds-ca-client` (npm, version 2.1.0+)

This API provides flat CDR data suitable for bulk analytics and reporting.

### GET /v1/calls

Returns paginated call records in a flat format.

**Query parameters:**

| Parameter | Description |
|---|---|
| `limit` | Max results |
| `offset` | Pagination offset |
| `dateFrom` | Start date (YYYY-MM-DD) |
| `dateTo` | End date (YYYY-MM-DD) |

**Example:**

```bash
curl "https://cds-ca.wildix.com/v1/calls?limit=100&dateFrom=2026-02-01&dateTo=2026-02-22" \
  -H "Authorization: Bearer wsk-v1-..."
```

**Response:**

```json
{
  "items": [
    {
      "id": "ee_ee012844_1771792236.10057_0",
      "sessionId": "ee_ee012844_1771792236.10057",
      "type": "call",
      "startTime": "2026-02-22 20:30:36",
      "time": "2026-02-22 20:30:56",
      "direction": "INBOUND",
      "status": "MISSED",
      "duration": 20,
      "durationMs": 20044,
      "talkTime": 0,
      "talkTimeMs": 0,
      "connectTime": 0,
      "waitTime": 20,
      "holdTime": 0,
      "queueTime": 0,
      "pbx": "22110001d072",
      "part": 0,
      "service": "",
      "serviceNumber": "+390681150356",
      "callDestination": "+390681150356",
      "callCallerPhone": "+393792424921",
      "callCallerName": "+393792424921",
      "callCallerEmail": "",
      "callCallerUserId": "",
      "callCallerUserExtension": "",
      "callCallerGroupId": "",
      "callCallerGroupName": "",
      "callCallerType": "REMOTE",
      "callCallerDevice": "",
      "callCallerMos": "0",
      "callCalleePhone": "",
      "callCalleeName": "",
      "callCalleeEmail": "",
      "callCalleeUserId": "",
      "callCalleeUserExtension": "",
      "callCalleeGroupId": "",
      "callCalleeGroupName": "",
      "callCalleeType": "",
      "callCalleeDevice": "",
      "callCalleeMos": "0",
      "callRemotePhone": "+393792424921",
      "callRemoteCountryCode": "39",
      "callRemoteCountryCodeStr": "IT",
      "callRemoteLocation": "",
      "callEndBy": "CALLER",
      "callEndCause": "",
      "callTrunkName": "classound",
      "callTrunkDirection": "incoming",
      "callGroupName": "",
      "callGroupId": "",
      "callRecordings": "",
      "flags": "",
      "tags": "",
      "company_id": "ee_ee012844"
    }
  ]
}
```

### POST /v1/dumps

Creates a bulk CSV export for a date range.

**Request body:**

```json
{
  "type": "calls",
  "dateFrom": "2026-02-01",
  "dateTo": "2026-02-22"
}
```

**Response:**

```json
{
  "id": "261466e8-8eac-4d6b-a403-d56b03db22c0"
}
```

### GET /v1/dumps/{id}

Polls the export status.

**Response:**

```json
{
  "status": "COMPLETED",
  "presignedDownloadUrl": "https://wildix-data-storage-eu-south-1.s3.amazonaws.com/..."
}
```

- `status`: `COMPLETED` | `ERROR` | `<other>` (in progress, keep polling)
- `presignedDownloadUrl`: Temporary S3 URL (valid ~1 hour) to download the CSV

**CSV columns in the dump:**

`company_id`, `session_id`, `id`, `type`, `time`, `start_time`, `connect_time`, `connect_time_ms`, `talk_time`, `talk_time_ms`, `wait_time`, `wait_time_ms`, `duration`, `duration_ms`, `pbx`, `part`, `service`, `direction`, `call_destination`, `call_caller_type`, `call_caller_phone`, `call_caller_name`, `call_caller_company`, `call_caller_email`, `call_caller_user_id`, `call_caller_user_extension`, `call_caller_group_id`, `call_caller_group_name`, `call_caller_device`, `call_caller_mos`, `call_callee_phone`, `call_callee_type`, `call_callee_name`, `call_callee_company`, `call_callee_email`, `call_callee_user_id`, `call_callee_user_extension`, `call_callee_group_id`, `call_callee_group_name`, `call_callee_device`, `status`, `call_remote_phone`, `call_remote_country_code`, `call_remote_country_code_str`, `call_remote_location`, `call_end_cause`, `call_end_cause_str`, `call_end_by`, `call_group_name`, `call_recordings`, `call_split_reason`, `call_split_transfer_type`, `tags`, `flags`, `call_trunk_name`, `call_trunk_direction`, `call_group_id`, `conference_id`, `conference_subject`, `call_merge_with`, `conference_recordings`, `conference_transcription`, `service_number`, `call_callee_mos`, `hold_time`, `hold_time_ms`, `queue_time`, `queue_time_ms`, `cmp`, `date`

---

## Webhooks (Real-Time Events)

For real-time CRM integration, configure webhooks in WMS under `PBX → Integrations → Cloud integrations → Webhooks`.

**Webhook payload envelope:**

```json
{
  "id": "unique_event_id",
  "pbx": "22110001d072",
  "company": "ee_ee012844",
  "time": 1771782460000,
  "type": "call:live:completed",
  "integrationId": "integration_id",
  "data": { ... }
}
```

**Event types:**

| Event | When |
|---|---|
| `call:live:progress` | Call starts or updates (ringing, answered, transferred) |
| `call:live:completed` | Call ends normally |
| `call:live:interrupted` | Call ends due to error |
| `call:live:transcription` | Transcription segment available |

**`call:live:progress` data fields:**
- `caller` / `callee` - participant details (same structure as CallParticipant)
- `duration`, `connectTime`, `talkTime`, `waitTime`, `holdTime`, `queueTime`
- `direction` - `INBOUND` | `OUTBOUND` | `INTERNAL`
- Recording filenames in the payload

**`call:live:transcription` data fields:**
- Transcription chunks with speaker, text, language, timestamps

**Security:** Validate the `x-signature` header using HMAC-SHA256 with your webhook secret:

```javascript
const signature = crypto
  .createHmac('sha256', webhookSecret)
  .update(JSON.stringify(req.body))
  .digest('hex');

if (signature !== req.headers['x-signature']) {
  return res.status(401).send('Invalid signature');
}
```

**Requirements for webhook endpoint:**
- Must be reachable from the public internet
- Must accept HTTP POST with JSON body
- Must respond with HTTP 2xx
- Must respond quickly (process async)
- Must handle duplicate delivery (same call may arrive multiple times on retry)

---

## Recording Downloads

### Call Recordings

Call recordings are WAV files stored on the PBX. The URL format is:

```
https://gbhotels.wildixin.com:443/spoolview/recordings/[path]/[filename].wav
```

Filename pattern: `YYYY.MM.DD-HH.MM.SS-extension-phone[pbx]-hash-index.wav`

The recording URL appears in `CallRecord.attachments[].recording.url` (preferred) or the deprecated `CallRecord.recordingsData[].url`.

**Authentication:** Requires a **PBX Simple Token** (not `wsk-v1`):

```bash
curl "https://gbhotels.wildixin.com:443/spoolview/recordings/.../filename.wav" \
  -H "Authorization: Bearer <PBX_SIMPLE_TOKEN>" \
  -L   # follow redirects to cloud storage
```

### Batch Recording Download

For bulk downloads, use the PBX recordings task API (requires PBX Simple Token):

```bash
# Step 1: Create download task
curl -X POST "https://gbhotels.wildixin.com:443/api/v1/PBX/recordings/download/" \
  -H "Authorization: Bearer <PBX_SIMPLE_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"from": 1771700000, "to": 1771800000}'

# Step 2: Poll status (returns task ID from step 1)
curl "https://gbhotels.wildixin.com:443/api/v1/PBX/recordings/download/{taskId}" \
  -H "Authorization: Bearer <PBX_SIMPLE_TOKEN>"
```

### Voicemail Downloads

Voicemail MP3 files are accessible at:

```
https://gbhotels.wildixin.com:443/spoolview/voicemail/[path]/[filename].mp3
```

The URL appears in `CallRecord.attachments[].voicemail.url`.

Same authentication rules as recordings - requires PBX Simple Token.

---

## Pagination

All list endpoints support `limit` and `offset` parameters.

**WDA History API** (POST body):
```json
{ "limit": 100, "offset": 0 }
```

**CDS CA API** (query params):
```
?limit=100&offset=0
```

**x-bees Conversations API** (query params):
```
?limit=50&offset=0
```

No documented maximum limit. Recommend using 100-500 per page for WDA History.

---

## Data Model: Identifying Agents

### Agent identification in CallRecord

For an inbound call, the agent is the **callee** with `type: "LOCAL"`:

```json
{
  "callee": {
    "type": "LOCAL",
    "role": "AGENT",
    "userId": "9186639",        // PBX user ID
    "userExtension": "212",
    "email": "francescagbviaggi@gmail.com",
    "name": "Francesca Colombo",
    "groupName": "Default",
    "userDepartment": "Booking",
    "userDevice": "XBEES_ANDROID"
  }
}
```

For an outbound call, the agent is the **caller** with `type: "LOCAL"`.

Note: The `QueryConversations` endpoint returns each call leg as a separate record from different perspectives. For the same call, you may see multiple `CallRecord` objects with the same `id` but different caller/callee perspectives. Use `GetCall` with a specific `flowIndex` to get the authoritative single record.

### x-bees User ID vs PBX User ID

The x-bees user ID (e.g. `bvK6nGTDxZeU`) is different from the PBX user ID (e.g. `9186639`).

- **WDA History API `user` parameter** uses **PBX user ID** (numeric)
- **x-bees channel `createdBy` field** uses **x-bees user ID** (alphanumeric)
- The mapping is available in channel `assignee` objects which include both `id` (x-bees) and `pbxUserId` (PBX)

---

## CRM Integration Approach

### Recommended approach for call log syncing

1. **Poll WDA History API** on a schedule (every 5-15 minutes):
   ```
   POST https://wda.wildix.com/v2/history/conversations
   { "filter": { "from": "<last_sync_time>", "to": "<now>" } }
   ```

2. **For each CallRecord:**
   - Agent = the participant with `type: "LOCAL"` (caller for outbound, callee for inbound)
   - Customer = the participant with `type: "REMOTE"`
   - Phone number = `remotePhone` field
   - Duration = `talkTime` (actual conversation) or `duration` (total)
   - Status = `callStatus` field (`COMPLETED` | `MISSED`)
   - Direction = `direction` field (`INBOUND` | `OUTBOUND`)
   - Voicemail = check `flags` array for `"voicemail"` or `attachments[].voicemail`

3. **For calls with recordings:**
   - Check `attachments[].recording.url`
   - To download: need PBX Simple Token (separate credential from `wsk-v1`)
   - Alternative: provide the URL to agents who can log into the PBX

4. **For transcriptions:**
   - Check `transcriptionStatus === "AVAILABLE"` before requesting
   - Use `GET /v2/history/calls/{id}/flows/{flowIndex}/transcription/text` for human-readable format
   - Retry up to 3 times if `POST_TRANSCRIPTION` status

5. **For bulk initial import:**
   - Use CDS CA API `/v1/calls` with date range filters, or
   - Create a CSV dump with `POST /v1/dumps` and download the presigned S3 URL

---

## Error Handling

**WDA History API error codes:**

| Error | Cause |
|---|---|
| `CallNotFoundException` | Call ID not found or no access |
| `CallTranscriptionNotFoundException` | No transcription for this call |
| `ForbiddenException` | API key lacks permission |
| `ValidationException` | Invalid request parameters |

**HTTP status codes:**

| Code | Meaning |
|---|---|
| `200` | Success |
| `400` | Bad request (missing required params, e.g. `user` for QueryUserCalls) |
| `401` | Unauthorized (invalid or missing API key) |
| `404` | Resource not found |

---

## Environment / Staging

The WDA SDK supports different environments:

```javascript
const client = new WdaHistoryClient({
  token: { token: () => Promise.resolve(API_KEY) },
  env: 'stage'   // or 'stable' for staging environments
});
// Uses: wda-stage.wildix.com or wda-stable.wildix.com
// Default (no env): wda.wildix.com (production)
```

---

## Reference Links

- [WDA History API Reference](https://docs.wildix.com/api-reference/rest/wda/history/)
- [WDA REST API Overview](https://docs.wildix.com/api-reference/rest/wda/)
- [x-bees REST API Reference](https://docs.wildix.com/api-reference/rest/x-bees/conversations/)
- [API Key Authentication Guide](https://docs.wildix.com/guides/2025/10/01/api-keys-auth-guide/)
- [Download Call Recordings & Transcriptions](https://docs.wildix.com/guides/2025/02/13/calls-audio-recordings/)
- [Obtaining Cloud Analytics Data from CDS](https://docs.wildix.com/guides/2024/08/24/cds-ca/)
- [Webhook CRM Integration Guide](https://docs.wildix.com/guides/2024/07/01/webhooks-calls-crm-intergration/)
- [Wildix Developer Docs Home](https://docs.wildix.com/api-reference/)
- [npm: @wildix/wda-history-client](https://www.npmjs.com/package/@wildix/wda-history-client)
- [npm: @wildix/cds-ca-client](https://www.npmjs.com/package/@wildix/cds-ca-client)
