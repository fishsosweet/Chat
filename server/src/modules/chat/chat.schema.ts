import { z } from "zod";

export const conversationListSchema = z.object({
  query: z.object({
    cursor: z.string().datetime().optional(),
    limit: z.coerce.number().int().min(1).max(50).default(30)
  })
});

export const conversationMessagesSchema = z.object({
  params: z.object({
    conversationId: z.uuid()
  }),
  query: z.object({
    cursor: z.string().datetime().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(30)
  })
});

export const createDirectConversationSchema = z.object({
  body: z.object({
    targetUserId: z.uuid()
  })
});
