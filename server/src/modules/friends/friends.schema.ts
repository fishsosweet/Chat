import { z } from "zod";

export const searchUsersSchema = z.object({
  query: z.object({
    keyword: z.string().trim().min(1).max(120),
    limit: z.coerce.number().int().min(1).max(50).default(20)
  })
});

export const createFriendRequestSchema = z.object({
  body: z.object({
    targetUserId: z.string().uuid()
  })
});

export const friendIdParamSchema = z.object({
  params: z.object({
    friendId: z.string().uuid()
  })
});

export const userIdParamSchema = z.object({
  params: z.object({
    userId: z.string().uuid()
  })
});
