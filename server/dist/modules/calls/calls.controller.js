"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCallHistoryController = void 0;
const app_error_1 = require("../../common/errors/app-error");
const calls_service_1 = require("./calls.service");
const getCallHistoryController = async (req, res) => {
    if (!req.auth?.userId) {
        throw new app_error_1.AppError("Unauthorized", 401);
    }
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 20);
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const data = await (0, calls_service_1.getMyCallHistory)(req.auth.userId, Number.isNaN(page) ? 1 : page, Number.isNaN(limit) ? 20 : limit, status);
    res.status(200).json({ success: true, data, requestId: req.requestId });
};
exports.getCallHistoryController = getCallHistoryController;
