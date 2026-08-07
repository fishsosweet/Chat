"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const compression_1 = __importDefault(require("compression"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const helmet_1 = __importDefault(require("helmet"));
const pino_http_1 = __importDefault(require("pino-http"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const cors_2 = require("./config/cors");
const env_1 = require("./config/env");
const logger_1 = require("./config/logger");
const swagger_1 = require("./docs/swagger");
const request_id_middleware_1 = require("./common/middlewares/request-id.middleware");
const not_found_middleware_1 = require("./common/middlewares/not-found.middleware");
const error_handler_middleware_1 = require("./common/middlewares/error-handler.middleware");
const routes_1 = require("./routes");
exports.app = (0, express_1.default)();
exports.app.disable("x-powered-by");
exports.app.use(request_id_middleware_1.requestIdMiddleware);
exports.app.use((0, pino_http_1.default)({
    logger: logger_1.logger,
    customProps(req) {
        return {
            requestId: req.requestId
        };
    }
}));
exports.app.use((0, helmet_1.default)());
exports.app.use((0, cors_1.default)(cors_2.corsOptions));
exports.app.use((0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: "draft-7",
    legacyHeaders: false
}));
exports.app.use((0, compression_1.default)());
exports.app.use((0, cookie_parser_1.default)());
exports.app.use(express_1.default.json({ limit: "2mb" }));
exports.app.use(express_1.default.urlencoded({ extended: true, limit: "2mb" }));
exports.app.get("/", (_req, res) => {
    res.status(200).json({
        success: true,
        service: "ChatRealtime API",
        docs: "/docs"
    });
});
exports.app.use("/docs", swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swagger_1.swaggerSpec));
exports.app.use(env_1.env.API_PREFIX, routes_1.apiRouter);
exports.app.use(not_found_middleware_1.notFoundMiddleware);
exports.app.use(error_handler_middleware_1.errorHandlerMiddleware);
