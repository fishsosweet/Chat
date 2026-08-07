# Step 9 - Voice Call and Video Call

## Scope
Add realtime voice/video calling capability to chat conversations with signaling and WebRTC UI.

## Backend
### Signaling hardening
Updated signaling in:
- server/src/realtime/events/call.events.ts
- server/src/realtime/types/socket.types.ts

Key improvements:
- Membership check before forwarding call signaling events.
- Targeted delivery via target user room when targetUserId is provided.
- Sender is excluded from room-broadcast signaling.
- Added support for end event.
- Payload fields now include callId, callType, SDP and ICE candidate data.

### Conversation payload support
Updated:
- server/src/modules/chat/chat.service.ts

Added counterpartUserId in conversation list payload so frontend can target direct call recipient.

## Frontend
### Chat UI call actions
Updated:
- client/src/features/chat/pages/chat-page.tsx

Added:
- Voice call button
- Video call button
- End call button
- Incoming call banner with accept/reject
- Local + remote media rendering (video and audio)

### WebRTC flow
Implemented:
- getUserMedia for voice/video mode
- RTCPeerConnection lifecycle
- Offer/answer exchange over socket signaling
- ICE candidate exchange
- Reject/end handling and media cleanup

### Conversation selection metadata
Updated:
- client/src/features/chat/components/conversation-list.tsx
- client/src/features/chat/api/chat.api.ts

Conversation selection now passes counterpartUserId for call targeting.

## Tests and Validation
### Build checks
- npm --prefix server run typecheck: PASS
- npm --prefix server run build: PASS
- npm --prefix client run build: PASS

### New automated signaling smoke test
Added:
- server/scripts/call-smoke-test.mjs
- npm script: test:call-smoke

Run result:
- CALL_SMOKE_OK conversation=<uuid> call=true offer=true answer=true ice=true end=true

## Notes
- Current media relay is peer-to-peer WebRTC; production deployment should use TURN servers for NAT traversal reliability.
- Signaling and media currently optimized for direct calls; group call UI can be layered next using existing call model and participants.
