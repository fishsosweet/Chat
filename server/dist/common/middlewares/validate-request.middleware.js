"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRequest = void 0;
const app_error_1 = require("../errors/app-error");
const validateRequest = (schema) => {
    return (req, _res, next) => {
        const parsed = schema.safeParse({
            body: req.body,
            params: req.params,
            query: req.query,
            headers: req.headers
        });
        if (!parsed.success) {
            next(new app_error_1.AppError("Validation failed", 422, parsed.error.flatten()));
            return;
        }
        next();
    };
};
exports.validateRequest = validateRequest;
