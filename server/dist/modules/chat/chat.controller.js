"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDirectConversationController = exports.getConversationMessagesController = exports.listConversationsController = void 0;
const app_error_1 = require("../../common/errors/app-error");
const chat_service_1 = require("./chat.service");
const listConversationsController = async (req, res) => {
    if (!req.auth?.userId) {
        throw new app_error_1.AppError("Unauthorized", 401);
    }
    const cursor = typeof req.query.cursor === "string" ? req.query.cursor : undefined;
    const limit = Number(req.query.limit ?? 30);
    const data = await (0, chat_service_1.listConversations)(req.auth.userId, cursor, Number.isNaN(limit) ? 30 : limit);
    res.status(200).json({ success: true, data, requestId: req.requestId });
};
exports.listConversationsController = listConversationsController;
const getConversationMessagesController = async (req, res) => {
    if (!req.auth?.userId) {
        throw new app_error_1.AppError("Unauthorized", 401);
    }
    const cursor = typeof req.query.cursor === "string" ? req.query.cursor : undefined;
    const limit = Number(req.query.limit ?? 30);
    const conversationId = Array.isArray(req.params.conversationId) ? req.params.conversationId[0] : req.params.conversationId;
    const data = await (0, chat_service_1.getConversationMessages)(req.auth.userId, conversationId, cursor, Number.isNaN(limit) ? 30 : limit);
    res.status(200).json({ success: true, data, requestId: req.requestId });
};
exports.getConversationMessagesController = getConversationMessagesController;
const createDirectConversationController = async (req, res) => {
    if (!req.auth?.userId) {
        throw new app_error_1.AppError("Unauthorized", 401);
    }
    const data = await (0, chat_service_1.createOrGetDirectConversation)(req.auth.userId, req.body.targetUserId);
    res.status(201).json({ success: true, data, requestId: req.requestId });
};
exports.createDirectConversationController = createDirectConversationController;
