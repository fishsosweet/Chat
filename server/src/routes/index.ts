import { Router } from "express";
import { healthRouter } from "../modules/health/health.route";
import { authRouter } from "../modules/auth/auth.route";
import { adminRouter } from "../modules/admin/admin.route";
import { chatRouter } from "../modules/chat/chat.route";
import { callsRouter } from "../modules/calls/calls.route";
import { rtcConfigRouter } from "../modules/rtc-config/rtc-config.route";
import { friendsRouter } from "../modules/friends/friends.route";

export const apiRouter = Router();

apiRouter.use(healthRouter);
apiRouter.use(authRouter);
apiRouter.use(adminRouter);
apiRouter.use(chatRouter);
apiRouter.use(callsRouter);
apiRouter.use(rtcConfigRouter);
apiRouter.use(friendsRouter);
