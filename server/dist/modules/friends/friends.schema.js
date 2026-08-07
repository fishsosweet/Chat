"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userIdParamSchema = exports.friendIdParamSchema = exports.createFriendRequestSchema = exports.searchUsersSchema = void 0;
const zod_1 = require("zod");
exports.searchUsersSchema = zod_1.z.object({
    query: zod_1.z.object({
        keyword: zod_1.z.string().trim().min(1).max(120),
        limit: zod_1.z.coerce.number().int().min(1).max(50).default(20)
    })
});
exports.createFriendRequestSchema = zod_1.z.object({
    body: zod_1.z.object({
        targetUserId: zod_1.z.string().uuid()
    })
});
exports.friendIdParamSchema = zod_1.z.object({
    params: zod_1.z.object({
        friendId: zod_1.z.string().uuid()
    })
});
exports.userIdParamSchema = zod_1.z.object({
    params: zod_1.z.object({
        userId: zod_1.z.string().uuid()
    })
});
