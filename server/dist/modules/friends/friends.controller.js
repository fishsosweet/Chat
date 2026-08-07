"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.unfriendController = exports.cancelOutgoingFriendRequestController = exports.listFriendsController = exports.rejectFriendRequestController = exports.acceptFriendRequestController = exports.outgoingRequestsController = exports.incomingRequestsController = exports.createFriendRequestController = exports.searchUsersController = void 0;
const app_error_1 = require("../../common/errors/app-error");
const socket_gateway_1 = require("../../realtime/socket.gateway");
const chat_events_1 = require("../../realtime/events/chat.events");
const friends_service_1 = require("./friends.service");
const getParam = (value) => Array.isArray(value) ? value[0] : (value ?? "");
const requireUserId = (req) => {
    if (!req.auth?.userId) {
        throw new app_error_1.AppError("Unauthorized", 401);
    }
    return req.auth.userId;
};
const emitFriendChanged = (requesterId, addresseeId, payload) => {
    const io = (0, socket_gateway_1.getSocketServer)();
    if (!io) {
        return;
    }
    const data = {
        ...payload,
        requesterId,
        addresseeId,
        at: new Date().toISOString()
    };
    io.to((0, chat_events_1.userRoomKey)(requesterId)).emit("friendship_changed", data);
    io.to((0, chat_events_1.userRoomKey)(addresseeId)).emit("friendship_changed", data);
};
const searchUsersController = async (req, res) => {
    const userId = requireUserId(req);
    const keyword = typeof req.query.keyword === "string" ? req.query.keyword : "";
    const limit = Number(req.query.limit ?? 20);
    const data = await (0, friends_service_1.searchUsers)(userId, keyword, Number.isNaN(limit) ? 20 : limit);
    res.status(200).json({ success: true, data, requestId: req.requestId });
};
exports.searchUsersController = searchUsersController;
const createFriendRequestController = async (req, res) => {
    const userId = requireUserId(req);
    const data = await (0, friends_service_1.createFriendRequest)(userId, req.body.targetUserId);
    emitFriendChanged(data.requesterId, data.addresseeId, {
        friendId: data.id,
        action: "request_sent",
        actorUserId: userId
    });
    res.status(201).json({ success: true, data, requestId: req.requestId });
};
exports.createFriendRequestController = createFriendRequestController;
const incomingRequestsController = async (req, res) => {
    const userId = requireUserId(req);
    const data = await (0, friends_service_1.listIncomingRequests)(userId);
    res.status(200).json({ success: true, data, requestId: req.requestId });
};
exports.incomingRequestsController = incomingRequestsController;
const outgoingRequestsController = async (req, res) => {
    const userId = requireUserId(req);
    const data = await (0, friends_service_1.listOutgoingRequests)(userId);
    res.status(200).json({ success: true, data, requestId: req.requestId });
};
exports.outgoingRequestsController = outgoingRequestsController;
const acceptFriendRequestController = async (req, res) => {
    const userId = requireUserId(req);
    const friendId = getParam(req.params.friendId);
    const data = await (0, friends_service_1.acceptFriendRequest)(userId, friendId);
    emitFriendChanged(data.requesterId, data.addresseeId, {
        friendId: data.id,
        action: "accepted",
        actorUserId: userId
    });
    res.status(200).json({ success: true, data, requestId: req.requestId });
};
exports.acceptFriendRequestController = acceptFriendRequestController;
const rejectFriendRequestController = async (req, res) => {
    const userId = requireUserId(req);
    const friendId = getParam(req.params.friendId);
    const data = await (0, friends_service_1.rejectFriendRequest)(userId, friendId);
    emitFriendChanged(data.requesterId, data.addresseeId, {
        friendId: data.id,
        action: "rejected",
        actorUserId: userId
    });
    res.status(200).json({ success: true, data, requestId: req.requestId });
};
exports.rejectFriendRequestController = rejectFriendRequestController;
const listFriendsController = async (req, res) => {
    const userId = requireUserId(req);
    const data = await (0, friends_service_1.listFriends)(userId);
    res.status(200).json({ success: true, data, requestId: req.requestId });
};
exports.listFriendsController = listFriendsController;
const cancelOutgoingFriendRequestController = async (req, res) => {
    const userId = requireUserId(req);
    const friendId = getParam(req.params.friendId);
    const data = await (0, friends_service_1.cancelOutgoingFriendRequest)(userId, friendId);
    emitFriendChanged(data.requesterId, data.addresseeId, {
        friendId,
        action: "canceled",
        actorUserId: userId
    });
    res.status(200).json({ success: true, data, requestId: req.requestId });
};
exports.cancelOutgoingFriendRequestController = cancelOutgoingFriendRequestController;
const unfriendController = async (req, res) => {
    const userId = requireUserId(req);
    const otherUserId = getParam(req.params.userId);
    const data = await (0, friends_service_1.unfriend)(userId, otherUserId);
    emitFriendChanged(data.requesterId, data.addresseeId, {
        action: "unfriended",
        actorUserId: userId
    });
    res.status(200).json({ success: true, data, requestId: req.requestId });
};
exports.unfriendController = unfriendController;
