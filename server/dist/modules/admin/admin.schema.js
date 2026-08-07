"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reportActionSchema = exports.attachmentIdParamSchema = exports.groupIdParamSchema = exports.userIdParamSchema = exports.resetPasswordSchema = exports.lockUserSchema = exports.listQuerySchema = void 0;
const zod_1 = require("zod");
exports.listQuerySchema = zod_1.z.object({
    query: zod_1.z.object({
        search: zod_1.z.string().trim().optional(),
        page: zod_1.z.coerce.number().int().min(1).default(1),
        limit: zod_1.z.coerce.number().int().min(1).max(100).default(20)
    })
});
exports.lockUserSchema = zod_1.z.object({
    params: zod_1.z.object({
        userId: zod_1.z.uuid()
    }),
    body: zod_1.z.object({
        lock: zod_1.z.boolean()
    })
});
exports.resetPasswordSchema = zod_1.z.object({
    params: zod_1.z.object({
        userId: zod_1.z.uuid()
    }),
    body: zod_1.z.object({
        newPassword: zod_1.z
            .string()
            .min(8)
            .max(128)
            .regex(/[a-z]/)
            .regex(/[A-Z]/)
            .regex(/[0-9]/)
            .regex(/[^A-Za-z0-9]/)
    })
});
exports.userIdParamSchema = zod_1.z.object({
    params: zod_1.z.object({
        userId: zod_1.z.uuid()
    })
});
exports.groupIdParamSchema = zod_1.z.object({
    params: zod_1.z.object({
        groupId: zod_1.z.uuid()
    })
});
exports.attachmentIdParamSchema = zod_1.z.object({
    params: zod_1.z.object({
        attachmentId: zod_1.z.uuid()
    })
});
exports.reportActionSchema = zod_1.z.object({
    params: zod_1.z.object({
        reportId: zod_1.z.uuid()
    }),
    body: zod_1.z.object({
        action: zod_1.z.enum(["resolve", "reject", "lock_user"])
    })
});
