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

export const createGroupSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).max(200),
    memberUserIds: z.array(z.uuid()).max(499).default([]),
    description: z.string().trim().max(500).optional()
  })
});

export const conversationIdParamSchema = z.object({
  params: z.object({
    conversationId: z.uuid()
  })
});

export const addGroupMembersSchema = z.object({
  params: z.object({
    conversationId: z.uuid()
  }),
  body: z.object({
    memberUserIds: z.array(z.uuid()).min(1).max(50)
  })
});

export const removeGroupMemberSchema = z.object({
  params: z.object({
    conversationId: z.uuid(),
    userId: z.uuid()
  })
});
