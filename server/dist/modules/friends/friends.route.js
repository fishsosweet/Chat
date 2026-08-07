"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.friendsRouter = void 0;
const express_1 = require("express");
const auth_middleware_1 = require("../../common/middlewares/auth.middleware");
const async_handler_1 = require("../../common/utils/async-handler");
const validate_request_middleware_1 = require("../../common/middlewares/validate-request.middleware");
const friends_controller_1 = require("./friends.controller");
const friends_schema_1 = require("./friends.schema");
exports.friendsRouter = (0, express_1.Router)();
exports.friendsRouter.use(auth_middleware_1.authMiddleware);
/**
 * @openapi
 * /friends/users:
 *   get:
 *     tags: [Friend]
 *     summary: Search users for friend requests
 */
exports.friendsRouter.get("/friends/users", (0, validate_request_middleware_1.validateRequest)(friends_schema_1.searchUsersSchema), (0, async_handler_1.asyncHandler)(friends_controller_1.searchUsersController));
/**
 * @openapi
 * /friends/requests:
 *   post:
 *     tags: [Friend]
 *     summary: Send a friend request
 */
exports.friendsRouter.post("/friends/requests", (0, validate_request_middleware_1.validateRequest)(friends_schema_1.createFriendRequestSchema), (0, async_handler_1.asyncHandler)(friends_controller_1.createFriendRequestController));
exports.friendsRouter.get("/friends/requests/incoming", (0, async_handler_1.asyncHandler)(friends_controller_1.incomingRequestsController));
exports.friendsRouter.get("/friends/requests/outgoing", (0, async_handler_1.asyncHandler)(friends_controller_1.outgoingRequestsController));
exports.friendsRouter.post("/friends/requests/:friendId/accept", (0, validate_request_middleware_1.validateRequest)(friends_schema_1.friendIdParamSchema), (0, async_handler_1.asyncHandler)(friends_controller_1.acceptFriendRequestController));
exports.friendsRouter.post("/friends/requests/:friendId/reject", (0, validate_request_middleware_1.validateRequest)(friends_schema_1.friendIdParamSchema), (0, async_handler_1.asyncHandler)(friends_controller_1.rejectFriendRequestController));
exports.friendsRouter.delete("/friends/requests/:friendId", (0, validate_request_middleware_1.validateRequest)(friends_schema_1.friendIdParamSchema), (0, async_handler_1.asyncHandler)(friends_controller_1.cancelOutgoingFriendRequestController));
exports.friendsRouter.get("/friends/list", (0, async_handler_1.asyncHandler)(friends_controller_1.listFriendsController));
exports.friendsRouter.delete("/friends/list/:userId", (0, validate_request_middleware_1.validateRequest)(friends_schema_1.userIdParamSchema), (0, async_handler_1.asyncHandler)(friends_controller_1.unfriendController));
