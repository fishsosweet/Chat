"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.callHistoryQuerySchema = void 0;
const zod_1 = require("zod");
exports.callHistoryQuerySchema = zod_1.z.object({
    query: zod_1.z.object({
        page: zod_1.z.coerce.number().int().min(1).default(1),
        limit: zod_1.z.coerce.number().int().min(1).max(50).default(20),
        status: zod_1.z.enum(["RINGING", "ONGOING", "ENDED", "MISSED", "REJECTED", "CANCELED", "FAILED"]).optional()
    })
});
