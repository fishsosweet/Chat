import { Router } from "express";
import { authMiddleware } from "../../common/middlewares/auth.middleware";
import { adminAuthMiddleware } from "../../common/middlewares/admin/admin-auth.middleware";
import { asyncHandler } from "../../common/utils/async-handler";
import { validateRequest } from "../../common/middlewares/validate-request.middleware";
import {
  attachmentIdParamSchema,
  groupIdParamSchema,
  listQuerySchema,
  lockUserSchema,
  reportActionSchema,
  resetPasswordSchema,
  userIdParamSchema
} from "./admin.schema";
import {
  deleteFileController,
  deleteUserController,
  dissolveGroupController,
  getAuditLogsController,
  getFilesController,
  getGroupsController,
  getOverviewController,
  getReportsController,
  getTrendsController,
  getUsersController,
  lockUserController,
  reportActionController,
  resetPasswordController
} from "./admin.controller";

export const adminRouter = Router();

adminRouter.use("/admin", authMiddleware, adminAuthMiddleware);

adminRouter.get("/admin/overview", asyncHandler(getOverviewController));
adminRouter.get("/admin/trends", asyncHandler(getTrendsController));

adminRouter.get("/admin/users", validateRequest(listQuerySchema), asyncHandler(getUsersController));
adminRouter.patch("/admin/users/:userId/lock", validateRequest(lockUserSchema), asyncHandler(lockUserController));
adminRouter.delete("/admin/users/:userId", validateRequest(userIdParamSchema), asyncHandler(deleteUserController));
adminRouter.post(
  "/admin/users/:userId/reset-password",
  validateRequest(resetPasswordSchema),
  asyncHandler(resetPasswordController)
);

adminRouter.get("/admin/groups", validateRequest(listQuerySchema), asyncHandler(getGroupsController));
adminRouter.delete(
  "/admin/groups/:groupId",
  validateRequest(groupIdParamSchema),
  asyncHandler(dissolveGroupController)
);

adminRouter.get("/admin/files", validateRequest(listQuerySchema), asyncHandler(getFilesController));
adminRouter.delete(
  "/admin/files/:attachmentId",
  validateRequest(attachmentIdParamSchema),
  asyncHandler(deleteFileController)
);

adminRouter.get("/admin/reports", validateRequest(listQuerySchema), asyncHandler(getReportsController));
adminRouter.post(
  "/admin/reports/:reportId/action",
  validateRequest(reportActionSchema),
  asyncHandler(reportActionController)
);

adminRouter.get("/admin/audit-logs", validateRequest(listQuerySchema), asyncHandler(getAuditLogsController));
