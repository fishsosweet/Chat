"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.swaggerSpec = void 0;
const swagger_jsdoc_1 = __importDefault(require("swagger-jsdoc"));
exports.swaggerSpec = (0, swagger_jsdoc_1.default)({
    definition: {
        openapi: "3.0.3",
        info: {
            title: "ChatRealtime API",
            version: "1.0.0",
            description: "Production-ready backend API for realtime chat platform"
        },
        tags: [
            {
                name: "Health",
                description: "Service health and dependency checks"
            },
            {
                name: "Auth",
                description: "Authentication and session management"
            },
            {
                name: "Admin",
                description: "Admin dashboard and moderation endpoints"
            },
            {
                name: "Chat",
                description: "Conversation and message APIs for chat clients"
            },
            {
                name: "Call",
                description: "Call signaling metadata and history endpoints"
            },
            {
                name: "Friend",
                description: "Friend request and friendship management endpoints"
            }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: "http",
                    scheme: "bearer",
                    bearerFormat: "JWT"
                }
            }
        }
    },
    apis: ["src/modules/**/*.ts", "src/routes/**/*.ts"]
});
