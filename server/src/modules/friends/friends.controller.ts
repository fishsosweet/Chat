import { Request, Response } from "express";
import { AppError } from "../../common/errors/app-error";
import { getSocketServer } from "../../realtime/socket.gateway";
import { userRoomKey } from "../../realtime/events/chat.events";
import {
  acceptFriendRequest,
  cancelOutgoingFriendRequest,
  createFriendRequest,
  listFriends,
  listIncomingRequests,
  listOutgoingRequests,
  rejectFriendRequest,
  searchUsers,
  unfriend
} from "./friends.service";

const getParam = (value: string | string[] | undefined): string =>
  Array.isArray(value) ? value[0] : (value ?? "");

const requireUserId = (req: Request): string => {
  if (!req.auth?.userId) {
    throw new AppError("Unauthorized", 401);
  }

  return req.auth.userId;
};

const emitFriendChanged = (
  requesterId: string,
  addresseeId: string,
  payload: {
    friendId?: string;
    action: "request_sent" | "accepted" | "rejected" | "canceled" | "unfriended";
    actorUserId: string;
  }
) => {
  const io = getSocketServer();
  if (!io) {
    return;
  }

  const data = {
    ...payload,
    requesterId,
    addresseeId,
    at: new Date().toISOString()
  };

  io.to(userRoomKey(requesterId)).emit("friendship_changed", data);
  io.to(userRoomKey(addresseeId)).emit("friendship_changed", data);
};

export const searchUsersController = async (req: Request, res: Response): Promise<void> => {
  const userId = requireUserId(req);
  const keyword = typeof req.query.keyword === "string" ? req.query.keyword : "";
  const limit = Number(req.query.limit ?? 20);
  const data = await searchUsers(userId, keyword, Number.isNaN(limit) ? 20 : limit);
  res.status(200).json({ success: true, data, requestId: req.requestId });
};

export const createFriendRequestController = async (req: Request, res: Response): Promise<void> => {
  const userId = requireUserId(req);
  const data = await createFriendRequest(userId, req.body.targetUserId);
  emitFriendChanged(data.requesterId, data.addresseeId, {
    friendId: data.id,
    action: "request_sent",
    actorUserId: userId
  });
  res.status(201).json({ success: true, data, requestId: req.requestId });
};

export const incomingRequestsController = async (req: Request, res: Response): Promise<void> => {
  const userId = requireUserId(req);
  const data = await listIncomingRequests(userId);
  res.status(200).json({ success: true, data, requestId: req.requestId });
};

export const outgoingRequestsController = async (req: Request, res: Response): Promise<void> => {
  const userId = requireUserId(req);
  const data = await listOutgoingRequests(userId);
  res.status(200).json({ success: true, data, requestId: req.requestId });
};

export const acceptFriendRequestController = async (req: Request, res: Response): Promise<void> => {
  const userId = requireUserId(req);
  const friendId = getParam(req.params.friendId);
  const data = await acceptFriendRequest(userId, friendId);
  emitFriendChanged(data.requesterId, data.addresseeId, {
    friendId: data.id,
    action: "accepted",
    actorUserId: userId
  });
  res.status(200).json({ success: true, data, requestId: req.requestId });
};

export const rejectFriendRequestController = async (req: Request, res: Response): Promise<void> => {
  const userId = requireUserId(req);
  const friendId = getParam(req.params.friendId);
  const data = await rejectFriendRequest(userId, friendId);
  emitFriendChanged(data.requesterId, data.addresseeId, {
    friendId: data.id,
    action: "rejected",
    actorUserId: userId
  });
  res.status(200).json({ success: true, data, requestId: req.requestId });
};

export const listFriendsController = async (req: Request, res: Response): Promise<void> => {
  const userId = requireUserId(req);
  const data = await listFriends(userId);
  res.status(200).json({ success: true, data, requestId: req.requestId });
};

export const cancelOutgoingFriendRequestController = async (req: Request, res: Response): Promise<void> => {
  const userId = requireUserId(req);
  const friendId = getParam(req.params.friendId);
  const data = await cancelOutgoingFriendRequest(userId, friendId);
  emitFriendChanged(data.requesterId, data.addresseeId, {
    friendId,
    action: "canceled",
    actorUserId: userId
  });
  res.status(200).json({ success: true, data, requestId: req.requestId });
};

export const unfriendController = async (req: Request, res: Response): Promise<void> => {
  const userId = requireUserId(req);
  const otherUserId = getParam(req.params.userId);
  const data = await unfriend(userId, otherUserId);
  emitFriendChanged(data.requesterId, data.addresseeId, {
    action: "unfriended",
    actorUserId: userId
  });
  res.status(200).json({ success: true, data, requestId: req.requestId });
};
