import { z } from "zod";

export const listQuerySchema = z.object({
  query: z.object({
    search: z.string().trim().optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20)
  })
});

export const lockUserSchema = z.object({
  params: z.object({
    userId: z.uuid()
  }),
  body: z.object({
    lock: z.boolean()
  })
});

export const resetPasswordSchema = z.object({
  params: z.object({
    userId: z.uuid()
  }),
  body: z.object({
    newPassword: z
      .string()
      .min(8)
      .max(128)
      .regex(/[a-z]/)
      .regex(/[A-Z]/)
      .regex(/[0-9]/)
      .regex(/[^A-Za-z0-9]/)
  })
});

export const userIdParamSchema = z.object({
  params: z.object({
    userId: z.uuid()
  })
});

export const groupIdParamSchema = z.object({
  params: z.object({
    groupId: z.uuid()
  })
});

export const attachmentIdParamSchema = z.object({
  params: z.object({
    attachmentId: z.uuid()
  })
});

export const reportActionSchema = z.object({
  params: z.object({
    reportId: z.uuid()
  }),
  body: z.object({
    action: z.enum(["resolve", "reject", "lock_user"])
  })
});
