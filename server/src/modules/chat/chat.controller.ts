import { Request, Response } from "express";
import { AppError } from "../../common/errors/app-error";
import { conversationRoomKey, userRoomKey } from "../../realtime/events/chat.events";
import { getSocketServer } from "../../realtime/socket.gateway";
import {
  addGroupMembers,
  createGroup,
  createOrGetDirectConversation,
  getConversationMessages,
  getGroupMembers,
  listConversations,
  removeGroupMember
} from "./chat.service";

const getParam = (value: string | string[] | undefined): string =>
  Array.isArray(value) ? value[0] : (value ?? "");

const emitGroupMemberChanged = (
  conversationId: string,
  payload: {
    action: "added" | "removed" | "left";
    actorUserId: string;
    targetUserIds: string[];
    members?: unknown[];
  }
) => {
  const io = getSocketServer();
  if (!io) {
    return;
  }

  const data = {
    conversationId,
    ...payload,
    at: new Date().toISOString()
  };

  io.to(conversationRoomKey(conversationId)).emit("group_member_changed", data);

  for (const targetUserId of payload.targetUserIds) {
    io.to(userRoomKey(targetUserId)).emit("group_member_changed", data);

    if (payload.action === "added") {
      const sockets = io.sockets.adapter.rooms.get(userRoomKey(targetUserId));
      sockets?.forEach((socketId) => {
        io.sockets.sockets.get(socketId)?.join(conversationRoomKey(conversationId));
      });
    }
  }
};

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

export const createGroupController = async (req: Request, res: Response): Promise<void> => {
  if (!req.auth?.userId) {
    throw new AppError("Unauthorized", 401);
  }

  const data = await createGroup(
    req.auth.userId,
    req.body.name,
    req.body.memberUserIds ?? [],
    req.body.description
  );

  emitGroupMemberChanged(data.id, {
    action: "added",
    actorUserId: req.auth.userId,
    targetUserIds: data.memberUserIds.filter((memberId) => memberId !== req.auth!.userId)
  });

  res.status(201).json({ success: true, data, requestId: req.requestId });
};

export const getGroupMembersController = async (req: Request, res: Response): Promise<void> => {
  if (!req.auth?.userId) {
    throw new AppError("Unauthorized", 401);
  }

  const conversationId = getParam(req.params.conversationId);
  const data = await getGroupMembers(req.auth.userId, conversationId);
  res.status(200).json({ success: true, data, requestId: req.requestId });
};

export const addGroupMembersController = async (req: Request, res: Response): Promise<void> => {
  if (!req.auth?.userId) {
    throw new AppError("Unauthorized", 401);
  }

  const conversationId = getParam(req.params.conversationId);
  const data = await addGroupMembers(req.auth.userId, conversationId, req.body.memberUserIds);

  if (data.addedUserIds.length) {
    emitGroupMemberChanged(conversationId, {
      action: "added",
      actorUserId: req.auth.userId,
      targetUserIds: data.addedUserIds,
      members: data.members
    });
  }

  res.status(200).json({ success: true, data, requestId: req.requestId });
};

export const removeGroupMemberController = async (req: Request, res: Response): Promise<void> => {
  if (!req.auth?.userId) {
    throw new AppError("Unauthorized", 401);
  }

  const conversationId = getParam(req.params.conversationId);
  const targetUserId = getParam(req.params.userId);
  const data = await removeGroupMember(req.auth.userId, conversationId, targetUserId);

  emitGroupMemberChanged(conversationId, {
    action: data.action,
    actorUserId: req.auth.userId,
    targetUserIds: [targetUserId],
    members: data.members
  });

  res.status(200).json({ success: true, data, requestId: req.requestId });
};
