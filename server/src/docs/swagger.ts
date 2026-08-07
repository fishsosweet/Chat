import swaggerJsdoc from "swagger-jsdoc";

export const swaggerSpec = swaggerJsdoc({
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
