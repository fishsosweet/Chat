import { Request, Response } from "express";
import { AppError } from "../../common/errors/app-error";
import {
  createOrGetDirectConversation,
  getConversationMessages,
  listConversations
} from "./chat.service";

export const listConversationsController = async (req: Request, res: Response): Promise<void> => {
  if (!req.auth?.userId) {
    throw new AppError("Unauthorized", 401);
  }

  const cursor = typeof req.query.cursor === "string" ? req.query.cursor : undefined;
  const limit = Number(req.query.limit ?? 30);

  const data = await listConversations(req.auth.userId, cursor, Number.isNaN(limit) ? 30 : limit);
  res.status(200).json({ success: true, data, requestId: req.requestId });
};

export const getConversationMessagesController = async (req: Request, res: Response): Promise<void> => {
  if (!req.auth?.userId) {
    throw new AppError("Unauthorized", 401);
  }

  const cursor = typeof req.query.cursor === "string" ? req.query.cursor : undefined;
  const limit = Number(req.query.limit ?? 30);
  const conversationId = Array.isArray(req.params.conversationId) ? req.params.conversationId[0] : req.params.conversationId;

  const data = await getConversationMessages(
    req.auth.userId,
    conversationId,
    cursor,
    Number.isNaN(limit) ? 30 : limit
  );
  res.status(200).json({ success: true, data, requestId: req.requestId });
};

export const createDirectConversationController = async (req: Request, res: Response): Promise<void> => {
  if (!req.auth?.userId) {
    throw new AppError("Unauthorized", 401);
  }

  const data = await createOrGetDirectConversation(req.auth.userId, req.body.targetUserId);
  res.status(201).json({ success: true, data, requestId: req.requestId });
};
