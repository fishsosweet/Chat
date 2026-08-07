import { Router } from "express";
import { asyncHandler } from "../../common/utils/async-handler";
import { authMiddleware } from "../../common/middlewares/auth.middleware";
import { validateRequest } from "../../common/middlewares/validate-request.middleware";
import {
  conversationListSchema,
  conversationMessagesSchema,
  createDirectConversationSchema,
  createGroupSchema,
  conversationIdParamSchema,
  addGroupMembersSchema,
  removeGroupMemberSchema
} from "./chat.schema";
import {
  addGroupMembersController,
  createDirectConversationController,
  createGroupController,
  getConversationMessagesController,
  getGroupMembersController,
  listConversationsController,
  removeGroupMemberController
} from "./chat.controller";

export const chatRouter = Router();

chatRouter.use(authMiddleware);

/**
 * @openapi
 * /conversations:
 *   get:
 *     tags: [Chat]
 *     summary: Get current user conversation list
 */
chatRouter.get("/conversations", validateRequest(conversationListSchema), asyncHandler(listConversationsController));

/**
 * @openapi
 * /conversations/direct:
 *   post:
 *     tags: [Chat]
 *     summary: Create or get direct conversation
 */
chatRouter.post(
  "/conversations/direct",
  validateRequest(createDirectConversationSchema),
  asyncHandler(createDirectConversationController)
);

/**
 * @openapi
 * /conversations/group:
 *   post:
 *     tags: [Chat]
 *     summary: Create a group conversation
 */
chatRouter.post(
  "/conversations/group",
  validateRequest(createGroupSchema),
  asyncHandler(createGroupController)
);

/**
 * @openapi
 * /conversations/{conversationId}/members:
 *   get:
 *     tags: [Chat]
 *     summary: Get group members
 */
chatRouter.get(
  "/conversations/:conversationId/members",
  validateRequest(conversationIdParamSchema),
  asyncHandler(getGroupMembersController)
);

/**
 * @openapi
 * /conversations/{conversationId}/members:
 *   post:
 *     tags: [Chat]
 *     summary: Add members to a group
 */
chatRouter.post(
  "/conversations/:conversationId/members",
  validateRequest(addGroupMembersSchema),
  asyncHandler(addGroupMembersController)
);

/**
 * @openapi
 * /conversations/{conversationId}/members/{userId}:
 *   delete:
 *     tags: [Chat]
 *     summary: Remove a member from a group
 */
chatRouter.delete(
  "/conversations/:conversationId/members/:userId",
  validateRequest(removeGroupMemberSchema),
  asyncHandler(removeGroupMemberController)
);

/**
 * @openapi
 * /conversations/{conversationId}/messages:
 *   get:
 *     tags: [Chat]
 *     summary: Get paginated messages in a conversation
 */
chatRouter.get(
  "/conversations/:conversationId/messages",
  validateRequest(conversationMessagesSchema),
  asyncHandler(getConversationMessagesController)
);
