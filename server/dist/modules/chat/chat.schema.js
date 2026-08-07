"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDirectConversationSchema = exports.conversationMessagesSchema = exports.conversationListSchema = void 0;
const zod_1 = require("zod");
exports.conversationListSchema = zod_1.z.object({
    query: zod_1.z.object({
        cursor: zod_1.z.string().datetime().optional(),
        limit: zod_1.z.coerce.number().int().min(1).max(50).default(30)
    })
});
exports.conversationMessagesSchema = zod_1.z.object({
    params: zod_1.z.object({
        conversationId: zod_1.z.uuid()
    }),
    query: zod_1.z.object({
        cursor: zod_1.z.string().datetime().optional(),
        limit: zod_1.z.coerce.number().int().min(1).max(100).default(30)
    })
});
exports.createDirectConversationSchema = zod_1.z.object({
    body: zod_1.z.object({
        targetUserId: zod_1.z.uuid()
    })
});
