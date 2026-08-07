import { z } from "zod";

const emailSchema = z.email().max(320).toLowerCase();
const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password is too long")
  .regex(/[a-z]/, "Password must include a lowercase letter")
  .regex(/[A-Z]/, "Password must include an uppercase letter")
  .regex(/[0-9]/, "Password must include a number")
  .regex(/[^A-Za-z0-9]/, "Password must include a special character");

export const registerSchema = z.object({
  body: z.object({
    email: emailSchema,
    fullName: z.string().trim().min(2).max(120),
    password: passwordSchema,
    phone: z.string().trim().min(8).max(32).optional(),
    username: z.string().trim().min(3).max(64).optional()
  })
});

export const loginSchema = z.object({
  body: z.object({
    email: emailSchema,
    password: z.string().min(1),
    deviceName: z.string().trim().max(120).optional(),
    platform: z.enum(["WEB", "IOS", "ANDROID", "DESKTOP"]).default("WEB")
  })
});

export const refreshSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1).optional()
  })
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: emailSchema
  })
});

export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(1),
    newPassword: passwordSchema
  })
});

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1),
    newPassword: passwordSchema
  })
});

export const verifyEmailSchema = z.object({
  body: z.object({
    token: z.string().min(1)
  })
});

export const logoutSessionSchema = z.object({
  body: z.object({
    sessionId: z.string().uuid().optional()
  })
});
