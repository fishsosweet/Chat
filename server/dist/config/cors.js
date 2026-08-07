"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.corsOptions = void 0;
const env_1 = require("./env");
const whitelist = env_1.env.CORS_ORIGINS.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
exports.corsOptions = {
    origin(origin, callback) {
        if (!origin || whitelist.includes(origin)) {
            callback(null, true);
            return;
        }
        callback(new Error("Origin is not allowed by CORS"));
    },
    credentials: true
};
