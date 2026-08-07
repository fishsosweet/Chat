# Step 5 - Realtime (Socket.IO)

## Completed Scope
Realtime server integrated into backend with authenticated Socket.IO connections and core chat/call event handling.

## Implemented Realtime Features
- Socket connection with JWT access token validation
- Session validation against DB (active, not revoked, not expired)
- User presence update (online/offline + lastSeen)
- Conversation room auto-join based on member list
- Event handling:
  - connection
  - disconnect
  - typing
  - stop_typing
  - send_message
  - receive_message
  - delivered
  - seen
  - call
  - answer
  - reject
  - offer
  - ice_candidate
  - heartbeat
  - reconnect
  - sync_messages (message sync after reconnect)
- Message persistence through Prisma
- Delivery receipt upsert for delivered/seen tracking

## Architecture
- src/realtime/socket.server.ts
  - Socket.IO server bootstrap
  - auth middleware
  - room preload
  - lifecycle hooks
- src/realtime/services/socket-auth.service.ts
  - token + session validation
- src/realtime/services/presence.service.ts
  - per-user socket tracking and online/offline persistence
- src/realtime/events/chat.events.ts
  - typing, messaging, delivered/seen, sync
- src/realtime/events/call.events.ts
  - WebRTC signaling relay events
- src/realtime/types/socket.types.ts
  - typed payload contracts

## Validation
Automated smoke test script:
- server/scripts/realtime-smoke-test.mjs

What it verifies:
- register/login to get JWT
- authenticated socket connection
- heartbeat ack
- send_message ack
- sync_messages ack and payload

Latest result:
- `REALTIME_SMOKE_OK`

## Notes
- Redis adapter for multi-instance Socket.IO fan-out is not enabled in this step; current implementation is single-instance ready.
- Realtime auth depends on Step 4 JWT/session foundation.
