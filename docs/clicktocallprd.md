# Click-to-Call PRD — Wildix Integration for GBCRM

**Status:** Draft
**Date:** 2026-02-27
**Author:** Max (via Claude Code)
**Repository:** https://github.com/GBVAI/gbcrm
**Upstream:** https://github.com/twentyhq/twenty (v1.19)

---

## 1. Problem Statement

GB Viaggi is a high-volume travel contact center. Agents spend their entire workday making and receiving phone calls while managing customer records in the CRM. Today, even though Wildix PBX events are captured on the backend (inbound calls create `PhoneCall` records, contact matching works), **agents cannot initiate outbound calls from the CRM**. They must manually dial numbers on their desk phones or click `tel:` links that open a separate dialer app, breaking their workflow.

Every unnecessary context switch costs 5–10 seconds per call. At 80+ calls/day per agent across a team of 3 agents, that's **20–40 minutes of lost productivity daily**.

### Goals

1. **One-click dialing** from any phone number field in the CRM
2. **Persistent call bar** showing active call status with hold/hangup controls
3. **Post-call workflow** linking back to the PhoneCall record for notes/disposition
4. **Graceful fallback** to `tel:` links when Wildix is unavailable
5. **Zero-modal UX** — no confirmation dialogs, no popups, no extra steps

---

## 2. UX Design — Contact Center Perspective

### 2.1 Speed is Non-Negotiable

Travel contact center agents handle back-to-back calls. The click-to-call interaction must be:
- **1 click** to initiate a call (no "are you sure?" modal)
- **<200ms perceived response** (optimistic UI — show "Calling..." immediately, before the backend responds)
- **No page navigation** required — call from wherever the phone number is visible (record page, table view, timeline)

### 2.2 Context Preservation

When an agent clicks a phone number on a Person record, they should stay on that page. The call bar appears at the bottom of the screen but doesn't obscure the record. The agent can continue reading customer history, booking details, and notes while the phone rings.

### 2.3 Multi-Number Handling

Travel customers often have multiple numbers (mobile, office, WhatsApp). The existing `PhonesDisplay` component already renders all numbers. Each number becomes independently clickable. No dropdown picker needed — just click the one you want.

### 2.4 State Awareness

- If the agent is already on a call, clicking another number shows an error snackbar: "Already on a call"
- The call bar shows the current state: Initiating → Ringing → Connected → On Hold → Ended
- Duration timer counts up from connection

### 2.5 After-Call Work

When the call ends, the call bar doesn't vanish immediately. It transitions to a post-call prompt:
```
┌──────────────────────────────────────────────────────────────────┐
│  Call ended (2m 14s) · Marco Rossi    [Open Call Record]  [✕]   │
└──────────────────────────────────────────────────────────────────┘
```
- "Open Call Record" navigates to the PhoneCall detail page for notes/disposition
- Auto-dismisses after 15 seconds
- Dismiss button for immediate close

### 2.6 Error Recovery

If the Wildix API is unavailable:
1. Show error snackbar with explicit cause (`configuration missing`, `auth failed`, `service unavailable`, `timeout`)
2. Fall back to `tel:` **only** for deterministic non-call errors (for example missing config or explicit auth rejection)
3. For ambiguous network failures/timeouts, **do not auto-fallback** to avoid possible double-dial
4. Reset call state to idle and log an audit event

### 2.7 Resilience Across Reloads

After browser refresh, logout/login, or app redeploy, the call bar must recover state:
- On app mount, fetch active call state once (`GET /rest/wildix/calls/active`)
- If a call is active, restore `activeCallState` and show controls immediately
- Continue polling every 5s while active

---

## 3. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                         │
│                                                                 │
│  PhonesFieldDisplay ──→ useClickToCall() ──→ useWildixCall()    │
│  RecordPageAction  ──→ useClickToCall() ──→ useWildixCall()     │
│                              │                                  │
│                    activeCallState (Recoil atom)                │
│                              │                                  │
│                    WildixCallBar (floating bar)                 │
│                    WildixCallSyncEffect (polling)               │
└──────────────────────────────┬──────────────────────────────────┘
                               │ REST API
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                     BACKEND (NestJS)                            │
│                                                                 │
│  WildixCallControlController                                    │
│    POST /rest/wildix/calls/originate                            │
│    POST /rest/wildix/calls/:sipCallId/hangup                    │
│    POST /rest/wildix/calls/:sipCallId/hold                      │
│    POST /rest/wildix/calls/:sipCallId/unhold                    │
│    GET  /rest/wildix/calls/active                               │
│    GET  /rest/wildix/calls/status                               │
│                    │                                            │
│  WildixCallControlService                                       │
│    ├── WmsApiClient (@wildix/wms-api-client SDK)                │
│    │   ├── OriginateCallCommand({ number, name })               │
│    │   ├── CallControlHangupCommand({ sipCallId })              │
│    │   ├── CallControlHoldCommand({ sipCallId })                │
│    │   ├── CallControlUnholdCommand({ sipCallId })              │
│    │   └── ListUserActiveCallsCommand({ user })                 │
│    │                                                            │
│    └── WildixCallProcessorService.upsertPhoneCall()             │
│        (webhook-driven PhoneCall create/update by wildixCallId) │
│                                                                 │
│  EXISTING:                                                      │
│  WildixWebhookController (POST /webhooks/wildix/callback)       │
│    └── Updates PhoneCall record when call connects/ends         │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                     WILDIX PBX                                  │
│  WMS API ←── OriginateCallCommand                               │
│  Webhook ──→ POST /webhooks/wildix/callback                     │
│              (call:live:progress, call:live:completed, call:live:interrupted) │
└─────────────────────────────────────────────────────────────────┘
```

### 3.1 Why Backend Proxy (Not Direct Browser SDK)

The `@wildix/wms-api-client` SDK requires a WMS token. Exposing this token to the browser would be a security risk. The backend proxy also enables:
- **Server-side identity enforcement** (authenticated CRM user → mapped Wildix identity)
- **Agent extension resolution** (map CRM user → Wildix extension server-side)
- **Audit logging** of all outbound calls
- **Rate limiting** to prevent accidental double-dials

---

## 4. Wildix WMS API Reference (Source of Truth)

**SDK Package:** `@wildix/wms-api-client`
**Documentation:** https://docs.wildix.com/api-reference/typescript/wms-api-client/wms-api-client/
**Local reference:** `docs/wildix-sdk/wms-api-client.md` (1,563 lines)

### 4.1 Client Initialization

```typescript
import { WmsApiClient } from "@wildix/wms-api-client";

const client = new WmsApiClient({
  domain: "gbhotels.wildixin.com",  // WILDIX_WMS_DOMAIN env var
  token: tokenProvider,             // WILDIX_WMS_TOKEN env var
});
```

**Config interface:**

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `domain` | `string` | Yes | Wildix PBX domain (e.g. `gbhotels.wildixin.com`) |
| `port` | `number` | No | Optional port |
| `token` | `TokenProvider` | Yes | Authentication token |

### 4.1.1 Credential Verification (2026-02-28)

Live probes against `https://gbhotels.wildixin.com` confirm:

- `wsk-v1-...` (`WILDIX_API_KEY`) is **rejected** for PBX/WMS call-control endpoints (`401 Unauthorized`)
- `access_mws...` token is **accepted for authentication** on PBX/WMS endpoints
  - `POST /api/v1/Originate` returned `500` with empty payload (auth passed; request shape invalid)
  - `GET /api/v1/PBX/recordings/download/0` returned `404 Not found` (auth passed; resource missing)

Conclusion: click-to-call should use an `access_mws...`-style token, not `wsk-v1`.

### 4.2 OriginateCallCommand (Primary — Click-to-Call)

```typescript
import { OriginateCallCommand } from "@wildix/wms-api-client";

const command = new OriginateCallCommand({
  number: "+393336433864",
  name: "Marco Rossi",
});
const response = await client.send(command);
// response: { type: "result" | "error", result: "Success" }
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `number` | `string` | Yes | Phone number to call |
| `name` | `string` | No | Display name on agent's phone |
| `postpone` | `string` | No | Delay before initiating |

**Behavior:** Rings the authenticated user's phone first. When the agent picks up, it dials the destination number.

### 4.3 CallControlMakeCallCommand (Alternative — Lower Level)

```typescript
import { CallControlMakeCallCommand } from "@wildix/wms-api-client";

const command = new CallControlMakeCallCommand({
  destination: "+393336433864",
  user: "200",        // agent extension
  device: "SIP/200",  // specific device
});
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `destination` | `string` | Yes | Phone number or identifier |
| `user` | `string` | No | User extension making the call |
| `device` | `string` | No | Specific device to use |

### 4.4 ListUserActiveCallsCommand (Call State Polling)

```typescript
import { ListUserActiveCallsCommand } from "@wildix/wms-api-client";

const command = new ListUserActiveCallsCommand({ user: "200" });
const response = await client.send(command);
// response.calls: Call[]
```

**Call object:**

| Property | Type | Description |
|----------|------|-------------|
| `sipCallId` | `string` | SIP call identifier (needed for hangup/hold) |
| `callerNumber` | `string` | Caller phone number |
| `callerName` | `string` | Caller display name |
| `calleeNumber` | `string` | Callee phone number |
| `calleeName` | `string` | Callee display name |
| `state` | `string` | Call state (ringing, connected, on-hold, etc.) |
| `duration` | `number` | Duration in seconds |

### 4.5 Call Control Commands (In-Call Actions)

**CallControlHangupCommand:**
```typescript
import { CallControlHangupCommand } from "@wildix/wms-api-client";
await client.send(new CallControlHangupCommand({ sipCallId: "xxx", reason: "normal" }));
```

**CallControlHoldCommand:**
```typescript
import { CallControlHoldCommand } from "@wildix/wms-api-client";
await client.send(new CallControlHoldCommand({ sipCallId: "xxx" }));
```

**CallControlUnholdCommand:**
```typescript
import { CallControlUnholdCommand } from "@wildix/wms-api-client";
await client.send(new CallControlUnholdCommand({ sipCallId: "xxx" }));
```

**CallControlBlindTransferCommand:**
```typescript
import { CallControlBlindTransferCommand } from "@wildix/wms-api-client";
await client.send(new CallControlBlindTransferCommand({ sipCallId: "xxx", destination: "201" }));
```

**CallControlAttendantTransferCommand:**
```typescript
import { CallControlAttendantTransferCommand } from "@wildix/wms-api-client";
await client.send(new CallControlAttendantTransferCommand({ sipCallId: "xxx", destination: "201" }));
```

All call control commands take `sipCallId` (required) and optionally `user`. All return `{ message: string }`.

### 4.6 GetPbxColleaguesCommand (Agent Extension Lookup)

```typescript
import { GetPbxColleaguesCommand } from "@wildix/wms-api-client";
const command = new GetPbxColleaguesCommand({
  email: ["simone@gbviaggi.it"],
  fields: ["id", "extension", "email", "name"],
  count: 10,
});
const response = await client.send(command);
// response.result.records: PbxColleague[]
```

For MVP, use exact email match as the primary linkage strategy, then persist the resolved linkage in CRM after first successful match.

---

## 5. Existing Codebase Reference

### 5.1 Files That Will Be Modified

#### `packages/twenty-server/src/engine/core-modules/twenty-config/config-variables.ts`
**Purpose:** Backend config schema. Currently has 5 Wildix variables (lines 1274–1321).
**Change:** Add `WILDIX_WMS_DOMAIN` and `WILDIX_WMS_TOKEN`.
**Current Wildix variables:**
```typescript
WILDIX_API_KEY: string;        // wsk-v1 key for WDA History API
WILDIX_WORKSPACE_ID: string;   // Twenty workspace ID
WILDIX_PBX_TOKEN: string;      // PBX Simple Token for recordings
WILDIX_WEBHOOK_SECRET: string; // HMAC-SHA256 for webhook validation
WILDIX_COMPANY_ID: string;     // e.g. ee_ee012844
```

#### `packages/twenty-server/src/modules/wildix/wildix.module.ts`
**Purpose:** NestJS module definition for all Wildix services.
**Change:** Add `WildixCallControlService` to providers and `WildixCallControlController` to controllers.
**Current state:**
```typescript
@Module({
  imports: [TwentyConfigModule, GlobalWorkspaceDataSourceModule],
  controllers: [WildixWebhookController],
  providers: [
    WildixWebhookService,
    WildixCallProcessorService,
    WildixHistoryService,
  ],
  exports: [WildixHistoryService, WildixCallProcessorService],
})
export class WildixModule {}
```

#### `packages/twenty-server/src/engine/core-modules/client-config/client-config.entity.ts`
**Purpose:** GraphQL `ClientConfig` ObjectType exposed to frontend.
**Change:** Add `isWildixClickToCallEnabled: boolean` field.
**Pattern — current integration flags:**
```typescript
@Field(() => Boolean) isMicrosoftMessagingEnabled: boolean;
@Field(() => Boolean) isMicrosoftCalendarEnabled: boolean;
@Field(() => Boolean) isGoogleMessagingEnabled: boolean;
@Field(() => Boolean) isGoogleCalendarEnabled: boolean;
@Field(() => Boolean) isImapSmtpCaldavEnabled: boolean;
@Field(() => Boolean) isCloudflareIntegrationEnabled: boolean;
@Field(() => Boolean) isClickHouseConfigured: boolean;
```

#### `packages/twenty-server/src/engine/core-modules/client-config/services/client-config.service.ts`
**Purpose:** Populates `ClientConfig` from env vars.
**Change:** Add `isWildixClickToCallEnabled` derived from `WILDIX_WMS_DOMAIN` + `WILDIX_WMS_TOKEN` presence.
**Pattern:**
```typescript
isGoogleCalendarEnabled: this.twentyConfigService.get('CALENDAR_PROVIDER_GOOGLE_ENABLED'),
isClickHouseConfigured: !!this.twentyConfigService.get('CLICKHOUSE_URL'),
```

#### `packages/twenty-front/src/modules/client-config/types/ClientConfig.ts`
**Purpose:** Frontend TypeScript mirror of backend `ClientConfig`.
**Change:** Add `isWildixClickToCallEnabled: boolean`.
**Current integration flags:**
```typescript
isGoogleCalendarEnabled: boolean;
isGoogleMessagingEnabled: boolean;
isMicrosoftCalendarEnabled: boolean;
isMicrosoftMessagingEnabled: boolean;
isCloudflareIntegrationEnabled: boolean;
isClickHouseConfigured: boolean;
```

#### `packages/twenty-front/src/modules/client-config/components/ClientConfigProviderEffect.tsx`
**Purpose:** Fetches client config on app load, populates Recoil state.
**Change:** Populate `isWildixClickToCallEnabledState` atom from fetched config.

#### `packages/twenty-front/src/modules/object-record/record-field/ui/meta-types/display/components/PhonesFieldDisplay.tsx`
**Purpose:** Renders phone field values with click handler.
**Change:** Intercept clicks when Wildix enabled to originate calls instead of opening `tel:` links.
**Current code:**
```typescript
export const PhonesFieldDisplay = () => {
  const { fieldValue, fieldDefinition } = usePhonesFieldDisplay();
  const { copyToClipboard } = useCopyToClipboard();
  const { isFocused } = useFieldFocus();
  const { t } = useLingui();

  const onClickAction = fieldDefinition.metadata.settings?.clickAction;

  const handleClick = async (phoneNumber: string, event: React.MouseEvent<HTMLElement>) => {
    if (onClickAction === FieldMetadataSettingsOnClickAction.COPY) {
      event.preventDefault();
      copyToClipboard(phoneNumber, t`Phone number copied to clipboard`);
    }
  };

  return (
    <PhonesDisplay value={fieldValue} isFocused={isFocused} onPhoneNumberClick={handleClick} />
  );
};
```

#### `packages/twenty-front/src/modules/ui/field/display/components/PhonesDisplay.tsx`
**Purpose:** Renders phone numbers as `RoundedLink` components with `tel:` URIs.
**Change:** Add optional `showCallIcon` prop to render a small phone icon affordance when Wildix is enabled.
**Key detail:** Already accepts `onPhoneNumberClick` callback prop — this is the primary click intercept point.
```typescript
type PhonesDisplayProps = {
  value?: FieldPhonesValue;
  isFocused?: boolean;
  onPhoneNumberClick?: (phoneNumber: string, event: React.MouseEvent<HTMLElement>) => void;
};
```

#### `packages/twenty-front/src/modules/action-menu/actions/record-actions/single-record/types/SingleRecordActionsKey.ts`
**Purpose:** Enum of all single-record action keys.
**Change:** Add `CALL_PRIMARY_PHONE = 'call-primary-phone-single-record'`.
**Current entries:**
```typescript
export enum SingleRecordActionKeys {
  DELETE = 'delete-single-record',
  DESTROY = 'destroy-single-record',
  ADD_TO_FAVORITES = 'add-to-favorites-single-record',
  REMOVE_FROM_FAVORITES = 'remove-from-favorites-single-record',
  NAVIGATE_TO_NEXT_RECORD = 'navigate-to-next-record-single-record',
  NAVIGATE_TO_PREVIOUS_RECORD = 'navigate-to-previous-record-single-record',
  EXPORT_NOTE_TO_PDF = 'export-note-to-pdf-single-record',
  EXPORT_FROM_RECORD_INDEX = 'export-from-record-index-single-record',
  EXPORT_FROM_RECORD_SHOW = 'export-from-record-show-single-record',
  RESTORE = 'restore-single-record',
}
```

#### `packages/twenty-front/src/modules/action-menu/actions/record-actions/constants/DefaultRecordActionsConfig.tsx`
**Purpose:** Master config for all record actions — icons, labels, visibility, components.
**Change:** Add `CALL_PRIMARY_PHONE` entry, pinned, on Person/Company show pages.
**Pattern (ActionConfig type):**
```typescript
type ActionConfig = {
  type: ActionType;
  scope: ActionScope;
  key: string;
  label: MessageDescriptor | string;
  shortLabel?: MessageDescriptor | string;
  position: number;
  Icon: IconComponent;
  isPinned?: boolean;
  accent?: MenuItemAccent;
  availableOn?: ActionViewType[];
  shouldBeRegistered: (params: ShouldBeRegisteredFunctionParams) => boolean;
  component: React.ReactNode;
  hotKeys?: string[];
  requiredPermissionFlag?: PermissionFlagType;
};
```

#### `packages/twenty-front/src/modules/app/components/AppRouterProviders.tsx`
**Purpose:** Root provider tree for the authenticated app.
**Change:** Mount `<WildixCallBar />` after `<Outlet />` so it renders on all pages.

### 5.2 Files That Will Be Created

#### Backend (3 files)

| File | Purpose |
|------|---------|
| `packages/twenty-server/src/modules/wildix/services/wildix-call-control.service.ts` | NestJS injectable wrapping `@wildix/wms-api-client`. Methods: `isConfigured()`, `originateCall()`, `hangupCall()`, `holdCall()`, `unholdCall()`, `listActiveCalls()`. Lazy-initializes WMS client. |
| `packages/twenty-server/src/modules/wildix/controllers/wildix-call-control.controller.ts` | Authenticated REST endpoints for call control. Guarded by `JwtAuthGuard` + `WorkspaceAuthGuard`. |
| `packages/twenty-server/src/modules/wildix/dtos/originate-call.dto.ts` | Request body validation DTO for `POST /rest/wildix/calls/originate`. |

#### Frontend — State Management (2 files)

| File | Purpose |
|------|---------|
| `packages/twenty-front/src/modules/wildix-call/states/activeCallState.ts` | Recoil atom tracking current call: `{ status, sipCallId, destination, contactName, contactId, contactObjectName, phoneCallRecordId, startedAt, error }` |
| `packages/twenty-front/src/modules/wildix-call/states/isWildixClickToCallEnabledState.ts` | Recoil atom derived from ClientConfig |

#### Frontend — Hooks (3 files)

| File | Purpose |
|------|---------|
| `packages/twenty-front/src/modules/wildix-call/hooks/useWildixCall.ts` | Main hook: `originateCall()`, `hangup()`, `hold()`, `unhold()`. Manages `activeCallState`. Optimistic UI on originate. Falls back to `tel:` on error. |
| `packages/twenty-front/src/modules/wildix-call/hooks/useClickToCall.ts` | Convenience hook for phone field components: `handlePhoneClick(number, event, contactContext?)`. Intercepts `tel:` links when Wildix enabled. |
| `packages/twenty-front/src/modules/wildix-call/hooks/useWildixCallSync.ts` | Polls `GET /rest/wildix/calls/active` every 5s while call is active. Detects connected/ended transitions. Updates `sipCallId` in state. |

#### Frontend — Components (3 files)

| File | Purpose |
|------|---------|
| `packages/twenty-front/src/modules/wildix-call/components/WildixCallBar.tsx` | Floating bar at bottom of viewport. Shows call status, duration, hold/hangup buttons. Post-call prompt with "Open Call Record" link. |
| `packages/twenty-front/src/modules/wildix-call/components/CallDurationTimer.tsx` | `mm:ss` counting-up timer using `setInterval`. |
| `packages/twenty-front/src/modules/wildix-call/components/WildixCallSyncEffect.tsx` | Effect component mounted alongside `WildixCallBar`. Runs the polling logic from `useWildixCallSync`. |

#### Frontend — Action Menu (1 file)

| File | Purpose |
|------|---------|
| `packages/twenty-front/src/modules/action-menu/actions/record-actions/single-record/components/CallPrimaryPhoneSingleRecordAction.tsx` | Reads selected record's primary phone. Calls `originateCall()`. No modal/confirm. Only renders when Wildix enabled + record has phone. |

---

## 6. Backend API Design

### 6.1 `GET /rest/wildix/calls/status`

Returns whether click-to-call is available.

**Request:** No body. Requires JWT auth.

**Response:**
```json
{
  "configured": true,
  "mappingStatus": "linked"
}
```

`mappingStatus` values: `linked` | `not-found` | `ambiguous` | `stale`

### 6.2 `POST /rest/wildix/calls/originate`

Initiates an outbound call.

**Request:**
```json
{
  "destination": "+393336433864",
  "displayName": "Marco Rossi",
  "contactId": "uuid-of-person-record",
  "contactObjectName": "person",
  "idempotencyKey": "uuid-v4"
}
```

**Response (success):**
```json
{
  "success": true,
  "message": "Call originate accepted",
  "wildixResponseType": "result"
}
```

**Response (error):**
```json
{
  "success": false,
  "message": "Wildix identity not configured for this user"
}
```

**Backend logic:**
1. Resolve authenticated CRM user email (normalized lowercase/trimmed)
2. Try cached Wildix linkage stored in user vars at `(workspaceId, userId)` scope (`wildixExtension`, optional `wildixUserId`)
3. If cache missing/stale, query Wildix colleagues with exact email filter via `GetPbxColleaguesCommand`
4. If exactly one match: persist linkage in user vars for reuse across logins/redeploys
5. If zero or multiple matches: fail closed (`not-found` or `ambiguous`), no fuzzy name fallback
6. Enforce rate limit and idempotency (`idempotencyKey`) to prevent double-dial
7. Send `OriginateCallCommand({ number: destination, name: displayName })` via WMS SDK
8. Do **not** pre-create `PhoneCall` with null `wildixCallId`
9. `PhoneCall` records remain webhook-driven and idempotent on `wildixCallId`
10. UI shows "Open Call Record" only after webhook-created record is available

### 6.3 `GET /rest/wildix/calls/active`

Poll for active calls for the authenticated user.

**Request:** no query/body identity fields accepted from client.

**Response:**
```json
{
  "calls": [
    {
      "sipCallId": "abc123",
      "callerNumber": "200",
      "callerName": "Simone",
      "calleeNumber": "+393336433864",
      "calleeName": "Marco Rossi",
      "state": "connected",
      "duration": 45
    }
  ]
}
```

### 6.4 `POST /rest/wildix/calls/:sipCallId/hangup`

**Request:** no `user` field accepted.
**Response:** `{ "success": true, "message": "Call hung up" }`

### 6.5 `POST /rest/wildix/calls/:sipCallId/hold`

**Request:** no `user` field accepted.
**Response:** `{ "success": true, "message": "Call on hold" }`

### 6.6 `POST /rest/wildix/calls/:sipCallId/unhold`

**Request:** no `user` field accepted.
**Response:** `{ "success": true, "message": "Call resumed" }`

---

## 7. Frontend State Design

### 7.1 `activeCallState` (Recoil Atom)

```typescript
type WildixCallStatus = 'idle' | 'initiating' | 'ringing' | 'connected' | 'on-hold' | 'ended';

type ActiveCallState = {
  status: WildixCallStatus;
  sipCallId: string | null;           // From ListUserActiveCalls polling
  destination: string;                 // Phone number being called
  contactName: string | null;          // CRM display name
  contactId: string | null;            // Person/Company record ID
  contactObjectName: string | null;    // 'person' | 'company'
  phoneCallRecordId: string | null;    // PhoneCall record ID (set after webhook-backed record becomes available)
  startedAt: number | null;            // Unix timestamp for duration timer
  error: string | null;                // Last error message
};
```

**Default value:**
```typescript
{
  status: 'idle',
  sipCallId: null,
  destination: '',
  contactName: null,
  contactId: null,
  contactObjectName: null,
  phoneCallRecordId: null,
  startedAt: null,
  error: null,
}
```

### 7.2 State Transitions

```
idle ──[click phone number]──→ initiating
initiating ──[API success]──→ ringing
initiating ──[deterministic config/auth error]──→ idle (+ optional tel: fallback)
initiating ──[timeout/ambiguous network error]──→ idle (no auto-fallback)
idle ──[app mount + active call found]──→ connected
ringing ──[active call detected by poll]──→ connected
connected ──[hold button]──→ on-hold
on-hold ──[unhold button]──→ connected
connected/on-hold ──[hangup button]──→ ended
connected/on-hold ──[call disappears from poll]──→ ended
ended ──[15s timeout or dismiss]──→ idle
```

---

## 8. Component Hierarchy

```
AppRouterProviders
├── ... (existing providers)
├── <Outlet /> (page content)
├── <WildixCallBar />                    ← NEW: floating bar
│   ├── <CallDurationTimer />            ← NEW: mm:ss counter
│   └── [Hold] [Hangup] buttons
├── <WildixCallSyncEffect />             ← NEW: polling effect
└── ... (existing modals/overlays)

RecordShowPage
├── RecordShowPageHeader
│   └── PageHeaderActionMenuButtons
│       └── CallPrimaryPhoneSingleRecordAction  ← NEW: pinned "Call" button
└── PageLayoutRecordPageRenderer
    └── FieldWidget → PhonesFieldDisplay        ← MODIFIED: intercepts clicks
        └── PhonesDisplay                       ← MODIFIED: optional call icon
```

---

## 9. Implementation Phases

### Phase 1: Backend Proxy API
**Files:** 3 new + 2 modified in `twenty-server`
**Deliverable:** `POST /rest/wildix/calls/originate` works from curl/Postman
**Dependencies:** `@wildix/wms-api-client` npm package, WMS domain + token env vars
**Test:** `curl -X POST http://localhost:3000/rest/wildix/calls/originate -H "Authorization: Bearer $TOKEN" -d '{"destination":"+393336433864"}'` → agent's phone rings

### Phase 2: Frontend State + Inline Click-to-Call
**Files:** 5 new + 3 modified in `twenty-front`
**Deliverable:** Clicking a phone number on any record page initiates a call
**Test:** Open a Person record → click phone number → agent phone rings → snackbar shows "Calling..."

### Phase 3: Floating Call Bar
**Files:** 3 new + 1 modified in `twenty-front`
**Deliverable:** Persistent call bar during active calls with hold/hangup + post-call prompt
**Test:** Initiate call → bar appears → shows timer → hold/hangup work → after hangup shows "Open Call Record"

### Phase 4: Record Page Action Button
**Files:** 1 new + 2 modified in `twenty-front`
**Deliverable:** "Call" button pinned in Person/Company record page header
**Test:** Open Person with phone → see phone icon button in header → click → call starts

### Phase 5: MVP Email Auto-Link + Persistence
**Files:** Workspace member settings/entity + Wildix call-control service
**Deliverable:** Exact email auto-linking with persisted cache across logins/redeploys, fail-closed on ambiguity
**Test:** 10-15 agents auto-link by exact email; no reconnect prompt on re-login; ambiguous users blocked with actionable error

---

## 10. MVP Identity Strategy (Email-First)

For MVP, CRM users and Wildix users are linked by **exact email match**.

### 10.1 Linking Rules

1. Read authenticated CRM user email.
2. Normalize email (`trim`, lowercase).
3. Query Wildix colleagues with exact email filter.
4. If exactly one match, use that Wildix user/extension.
5. If zero matches: return `not-found` and show setup guidance.
6. If multiple matches: return `ambiguous` and require manual admin mapping.

### 10.2 Persistence Across Logins & Redeploys

To avoid reconnect prompts, persist linkage after first successful lookup in user vars at `(workspaceId, userId)` scope:

```typescript
type WildixMvpLink = {
  wildixExtension: string;
  wildixUserId?: string | null;
  wildixEmailSeen: string;
  lastVerifiedAt?: Date | null;
};
```

Runtime behavior:
- Use cached linkage first.
- Re-resolve by exact email only when cache missing/stale or Wildix rejects the cached identity.
- Keep a manual admin override for edge cases.

### 10.3 Explicit Non-Goals for MVP

- No fuzzy name matching for call routing.
- No client-supplied `user`/extension in API payloads.
- No mandatory per-user reconnect each login.

---

## 11. Existing Wildix Backend Integration (Context)

The backend Wildix integration is fully operational and handles incoming call events:

### Webhook Flow (already implemented)
```
Wildix PBX → POST /webhooks/wildix/callback → WildixWebhookController
  → validateSignature (HMAC-SHA256)
  → parseEvent (WildixWebhookService)
  → processCallEvent (WildixCallProcessorService)
    → upsertPhoneCall() — creates/updates PhoneCall record
    → linkCallToContact() — matches phone → Person records
```

### Key Types (`packages/twenty-server/src/modules/wildix/types/wildix-webhook-payload.type.ts`)

```typescript
type WildixEventType =
  | 'call:live:progress'
  | 'call:live:completed'
  | 'call:live:interrupted'
  | 'call:live:transcription';

type WildixCallEvent = {
  eventType: WildixEventType;
  callId: string;                    // e.g. "ee_ee012844_1771782181.10014"
  flowIndex: number;
  direction: 'INBOUND' | 'OUTBOUND' | 'INTERNAL' | 'UNKNOWN';
  status: 'IN_PROGRESS' | 'ANSWERED' | 'MISSED' | 'VOICEMAIL';
  remotePhone: string;
  remoteName: string;
  agentName: string;
  agentEmail: string;
  agentExtension: string;
  startedAt: Date | undefined;
  endedAt: Date | undefined;
  durationSeconds: number;
  waitSeconds: number;
  holdSeconds: number;
  endCause: string;
  recordingUrl: string;
  transcriptSegment?: string;
  // ... more fields
};
```

### PhoneCall Entity (`packages/twenty-server/src/modules/phone-call/standard-objects/phone-call.workspace-entity.ts`)

Key fields: `direction`, `callStatus`, `callerPhone`, `callerName`, `receiverPhone`, `agentName`, `startedAt`, `endedAt`, `durationSeconds`, `waitSeconds`, `recordingUrl`, `transcript`, `summary`, `wildixCallId`.

Relations: `phoneCallTargets` (links to Person/Company/Opportunity), `attachments`, `timelineActivities`.

---

## 12. Environment Variables Summary

### Existing (already in Railway)
| Variable | Purpose |
|----------|---------|
| `WILDIX_API_KEY` | wsk-v1 key for WDA History API |
| `WILDIX_WORKSPACE_ID` | Twenty workspace ID to associate calls with |
| `WILDIX_COMPANY_ID` | Wildix company ID (e.g. `ee_ee012844`) |
| `WILDIX_PBX_TOKEN` | PBX Simple Token for recording downloads |
| `WILDIX_WEBHOOK_SECRET` | HMAC-SHA256 for webhook validation |

### New (required for click-to-call)
| Variable | Purpose | Example |
|----------|---------|---------|
| `WILDIX_WMS_DOMAIN` | WMS API domain | `gbhotels.wildixin.com` |
| `WILDIX_WMS_TOKEN` | WMS API auth token (use `access_mws...`, not `wsk-v1`) | (obtain from Wildix WMS admin) |

### New (optional, rollout controls)
| Variable | Purpose | Example |
|----------|---------|---------|
| `WILDIX_AGENT_EXTENSION_MAP` | Bootstrap fallback map (not primary source of truth) | `simone@gbviaggi.it:200,riccardo@gbviaggi.it:201` |
| `WILDIX_CLICK_TO_CALL_ALLOWLIST` | Canary rollout list by CRM user email | `simone@gbviaggi.it,riccardo@gbviaggi.it` |

---

## 13. Testing & Verification Plan

### Backend Tests
1. **Unit test `WildixCallControlService`** — mock WMS SDK, verify correct commands dispatched
2. **Unit test `WildixCallControlController`** — verify auth guards, request validation, error handling
3. **Integration test** — verify `POST /rest/wildix/calls/originate` sends WMS command and does not accept client-supplied user identity
4. **Security test** — verify `/active`, `/hangup`, `/hold`, `/unhold` ignore/forbid `user` from client
5. **Webhook idempotency test** — duplicate `call:live:*` deliveries do not create duplicate PhoneCall records
6. **Interrupted-event test** — `call:live:interrupted` ends call state correctly

### Frontend Tests
1. **`useWildixCall` hook test** — verify state transitions: idle → initiating → ringing → connected → ended
2. **`useClickToCall` hook test** — verify `event.preventDefault()` when Wildix enabled, passthrough when disabled
3. **`WildixCallBar` component test** — verify renders correct UI for each call status, timer counts up
4. **`PhonesFieldDisplay` integration test** — verify click-to-call intercepted when Wildix enabled
5. **Bootstrap test** — refresh page during active call and verify call bar restores from `GET /rest/wildix/calls/active`

### Manual E2E Verification
1. Set `WILDIX_WMS_DOMAIN` + `WILDIX_WMS_TOKEN` env vars
2. Start dev server: `npx nx start twenty-server && npx nx start twenty-front`
3. Log in with agent credentials
4. Navigate to a Person record with a phone number
5. Click the phone number → agent's physical phone should ring
6. Pick up agent phone → destination phone should ring
7. Verify call bar appears with timer and hold/hangup buttons
8. Click hangup → call bar shows "Open Call Record" link
9. Click link → navigates to PhoneCall detail page
10. Refresh browser mid-call → call bar restores within one poll cycle

### Fallback Verification
1. Unset `WILDIX_WMS_DOMAIN` env var → restart
2. Verify no call icons, no "Call" action button, phone numbers still render as `tel:` links
3. Set env vars but use invalid token → click phone number → deterministic error state
4. Simulate timeout/network drop → verify no automatic `tel:` fallback (avoid possible double dial)

---

## 14. Production Go/No-Go Checklist

1. Persisted CRM user ↔ Wildix linkage exists (user vars keyed by workspace + user, or mapping table) and avoids duplicate extension assignments.
2. Two-agent canary passed: each user rings only their own Wildix device.
3. Call-control endpoints reject client-supplied identity fields.
4. Duplicate webhook delivery does not create duplicate PhoneCall records.
5. Refresh/relogin/redeploy during active call restores call bar state.
6. Kill switch and allowlist are configured for instant rollback/canary control.
7. Monitoring is live for originate failures, webhook failures, and call-control errors.
