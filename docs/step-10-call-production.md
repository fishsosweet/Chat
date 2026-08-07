# Step 10 - Production Optimization for Calls

## Scope
Improve call subsystem for production-readiness with:
- Durable call lifecycle persistence
- Better signaling validation and authorization
- Configurable ICE/TURN delivery to clients
- Call history API for analytics, support and troubleshooting

## Backend Improvements

### 1. Call lifecycle persistence
Added service:
- server/src/realtime/services/call-lifecycle.service.ts

Persisted lifecycle states in DB (`Call`, `CallParticipant`):
- call invite created -> `RINGING`
- answer accepted -> `ONGOING`, `startedAt`
- reject/cancel/end -> final state + `endedAt` + `durationSec`

### 2. Signaling hardening and event semantics
Updated:
- server/src/realtime/events/call.events.ts
- server/src/realtime/types/socket.types.ts

Enhancements:
- Membership checks before signaling relay
- Mandatory `callId` for answer/reject/end
- Event-specific DB lifecycle updates
- Targeted delivery by user room (`targetUserId`) for direct calls
- Added `end` signaling event handling

### 3. RTC config API (STUN/TURN from server)
Added endpoint:
- GET /api/v1/rtc/config

File:
- server/src/modules/rtc-config/rtc-config.route.ts

Server env support:
- RTC_ICE_SERVERS
- RTC_TURN_USERNAME
- RTC_TURN_CREDENTIAL

Updated env files:
- server/src/config/env.ts
- server/.env.example

### 4. Call history API
Added endpoint:
- GET /api/v1/calls/history?page&limit&status

Files:
- server/src/modules/calls/calls.schema.ts
- server/src/modules/calls/calls.service.ts
- server/src/modules/calls/calls.controller.ts
- server/src/modules/calls/calls.route.ts

### 5. Route and docs integration
Updated:
- server/src/routes/index.ts
- server/src/docs/swagger.ts

## Frontend Improvement

### RTC config consumption
Added:
- client/src/features/chat/api/rtc.api.ts

Updated call page to load ICE config from backend:
- client/src/features/chat/pages/chat-page.tsx

Fallback behavior:
- Uses bundled public STUN if `/rtc/config` is unavailable.

## Validation

### Build checks
- `npm --prefix server run typecheck`: PASS
- `npm --prefix server run build`: PASS
- `npm --prefix client run build`: PASS

### Runtime smoke tests
- `npm --prefix server run test:call-smoke`: PASS
- `npm --prefix server run test:call-history-smoke`: PASS

Sample outputs:
- `CALL_SMOKE_OK ... call=true offer=true answer=true ice=true end=true`
- `CALL_HISTORY_SMOKE_OK items=0 iceServers=2 ...`

## Operational Notes
- For real production connectivity, configure at least one TURN server in `RTC_ICE_SERVERS` and set credentials.
- Call history endpoint can be used by admin/support dashboards to investigate failed/missed sessions.
