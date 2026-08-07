"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatRouter = void 0;
const express_1 = require("express");
const async_handler_1 = require("../../common/utils/async-handler");
const auth_middleware_1 = require("../../common/middlewares/auth.middleware");
const validate_request_middleware_1 = require("../../common/middlewares/validate-request.middleware");
const chat_schema_1 = require("./chat.schema");
const chat_controller_1 = require("./chat.controller");
exports.chatRouter = (0, express_1.Router)();
exports.chatRouter.use(auth_middleware_1.authMiddleware);
/**
 * @openapi
 * /conversations:
 *   get:
 *     tags: [Chat]
 *     summary: Get current user conversation list
 */
exports.chatRouter.get("/conversations", (0, validate_request_middleware_1.validateRequest)(chat_schema_1.conversationListSchema), (0, async_handler_1.asyncHandler)(chat_controller_1.listConversationsController));
/**
 * @openapi
 * /conversations/direct:
 *   post:
 *     tags: [Chat]
 *     summary: Create or get direct conversation
 */
exports.chatRouter.post("/conversations/direct", (0, validate_request_middleware_1.validateRequest)(chat_schema_1.createDirectConversationSchema), (0, async_handler_1.asyncHandler)(chat_controller_1.createDirectConversationController));
/**
 * @openapi
 * /conversations/{conversationId}/messages:
 *   get:
 *     tags: [Chat]
 *     summary: Get paginated messages in a conversation
 */
exports.chatRouter.get("/conversations/:conversationId/messages", (0, validate_request_middleware_1.validateRequest)(chat_schema_1.conversationMessagesSchema), (0, async_handler_1.asyncHandler)(chat_controller_1.getConversationMessagesController));
