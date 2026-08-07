# Step 8 - Chat Core APIs and Live Message Sync

## Scope
Deliver core chat APIs used by the main user app and verify end-to-end message flow:
- Conversation list API for sidebar
- Create/get direct conversation API
- Conversation messages API for initial history
- Realtime send_message integration with REST readback

## Backend Changes
- Added chat module:
  - `server/src/modules/chat/chat.schema.ts`
  - `server/src/modules/chat/chat.service.ts`
  - `server/src/modules/chat/chat.controller.ts`
  - `server/src/modules/chat/chat.route.ts`
- Wired chat router:
  - `server/src/routes/index.ts`
- Added Swagger tag:
  - `server/src/docs/swagger.ts`

### New APIs
- `GET /api/v1/conversations?cursor&limit`
  - Returns paginated conversation list for authenticated user.
- `POST /api/v1/conversations/direct`
  - Body: `{ "targetUserId": "<uuid>" }`
  - Creates or returns existing direct conversation.
- `GET /api/v1/conversations/:conversationId/messages?cursor&limit`
  - Returns paginated messages in selected conversation (membership-guarded).

## Frontend Changes
- Extended chat client API:
  - `client/src/features/chat/api/chat.api.ts`
  - Added `getConversationMessages(...)`
- Integrated message history loading on conversation selection:
  - `client/src/features/chat/pages/chat-page.tsx`

## Bug Fix Included
- Scoped admin middleware to admin paths only:
  - `server/src/modules/admin/admin.route.ts`
- Fix prevents admin guard from accidentally intercepting non-admin APIs.

## Validation
### Compile checks
- `npm --prefix server run typecheck`: PASS
- `npm --prefix server run build`: PASS
- `npm --prefix client run build`: PASS

### Step 8 smoke test
- Added script: `server/scripts/chat-step8-smoke-test.mjs`
- Added npm command: `npm --prefix server run test:chat-step8-smoke`

Result:
- `CHAT_STEP8_SMOKE_OK conversation=<uuid> messages=1`
- Verified flow:
  1. Register secondary user
  2. Login primary user
  3. Create direct conversation
  4. List conversations
  5. Connect socket
  6. Send message via `send_message`
  7. Read messages via REST API

## Step Exit Criteria
- Core conversation APIs available and authenticated
- Client can fetch history when selecting conversation
- Realtime send path and REST message readback both working

Current status: PASSED.
