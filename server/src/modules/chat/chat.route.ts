import { Router } from "express";
import { asyncHandler } from "../../common/utils/async-handler";
import { authMiddleware } from "../../common/middlewares/auth.middleware";
import { validateRequest } from "../../common/middlewares/validate-request.middleware";
import {
  conversationListSchema,
  conversationMessagesSchema,
  createDirectConversationSchema
} from "./chat.schema";
import {
  createDirectConversationController,
  getConversationMessagesController,
  listConversationsController
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
