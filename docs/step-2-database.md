# Step 2 - Database Design (Production Ready)

## Scope
This step delivers a production-oriented relational model for the realtime chat platform using PostgreSQL + Prisma.

## Implemented
- Full Prisma schema in `server/prisma/schema.prisma`
- Covers required core entities:
  - User
  - Session
  - Friend
  - Conversation
  - Group
  - Member
  - Message
  - Attachment
  - Voice
  - Call
  - Notification
  - Reaction
  - Sticker
  - Device
  - LoginHistory
  - Report
  - AuditLog
- Additional scale-oriented entities:
  - MessageReceipt (delivered/seen per user, supports group chat)
  - CallParticipant (multi-participant call tracking)
  - PinnedMessage (pin management per conversation)

## Design Notes
- UUID primary keys for distributed scalability.
- Soft-delete support on user (`deletedAt`) and moderation-oriented fields on multiple entities.
- Composite indexes added on hot query paths:
  - message timeline
  - online/last seen lookup
  - unread notification scans
  - friend status filtering
  - call and report analytics windows
- `directKey` on conversation prevents duplicate 1-1 conversation creation.
- Attachment layer is storage-agnostic (`StorageProvider`) to switch Local -> S3 without schema rewrite.

## Environment
Copy `.env.example` to `.env` and adjust values.

Example:

```env
DATABASE_URL="postgresql://chat_user:chat_password@localhost:5432/chat_realtime?schema=public"
```

## Validation Commands
Run from repository root:

```bash
npm --prefix server run prisma:format
npm --prefix server run prisma:validate
```

## Step Exit Criteria
- Prisma schema formats successfully.
- Prisma validation passes.

Current status: PASSED.
