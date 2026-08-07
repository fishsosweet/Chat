import { Router } from "express";
import { authMiddleware } from "../../common/middlewares/auth.middleware";
import { asyncHandler } from "../../common/utils/async-handler";
import { validateRequest } from "../../common/middlewares/validate-request.middleware";
import {
  acceptFriendRequestController,
  cancelOutgoingFriendRequestController,
  createFriendRequestController,
  incomingRequestsController,
  listFriendsController,
  outgoingRequestsController,
  rejectFriendRequestController,
  searchUsersController,
  unfriendController
} from "./friends.controller";
import {
  createFriendRequestSchema,
  friendIdParamSchema,
  searchUsersSchema,
  userIdParamSchema
} from "./friends.schema";

export const friendsRouter = Router();

friendsRouter.use(authMiddleware);

/**
 * @openapi
 * /friends/users:
 *   get:
 *     tags: [Friend]
 *     summary: Search users for friend requests
 */
friendsRouter.get("/friends/users", validateRequest(searchUsersSchema), asyncHandler(searchUsersController));

/**
 * @openapi
 * /friends/requests:
 *   post:
 *     tags: [Friend]
 *     summary: Send a friend request
 */
friendsRouter.post(
  "/friends/requests",
  validateRequest(createFriendRequestSchema),
  asyncHandler(createFriendRequestController)
);

friendsRouter.get("/friends/requests/incoming", asyncHandler(incomingRequestsController));
friendsRouter.get("/friends/requests/outgoing", asyncHandler(outgoingRequestsController));

friendsRouter.post(
  "/friends/requests/:friendId/accept",
  validateRequest(friendIdParamSchema),
  asyncHandler(acceptFriendRequestController)
);

friendsRouter.post(
  "/friends/requests/:friendId/reject",
  validateRequest(friendIdParamSchema),
  asyncHandler(rejectFriendRequestController)
);

friendsRouter.delete(
  "/friends/requests/:friendId",
  validateRequest(friendIdParamSchema),
  asyncHandler(cancelOutgoingFriendRequestController)
);

friendsRouter.get("/friends/list", asyncHandler(listFriendsController));

friendsRouter.delete("/friends/list/:userId", validateRequest(userIdParamSchema), asyncHandler(unfriendController));
