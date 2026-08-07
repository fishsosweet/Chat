import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import pinoHttp from "pino-http";
import swaggerUi from "swagger-ui-express";
import { corsOptions } from "./config/cors";
import { env } from "./config/env";
import { logger } from "./config/logger";
import { swaggerSpec } from "./docs/swagger";
import { requestIdMiddleware } from "./common/middlewares/request-id.middleware";
import { notFoundMiddleware } from "./common/middlewares/not-found.middleware";
import { errorHandlerMiddleware } from "./common/middlewares/error-handler.middleware";
import { apiRouter } from "./routes";

export const app = express();

app.disable("x-powered-by");

app.use(requestIdMiddleware);
app.use(
  pinoHttp({
    logger,
    customProps(req) {
      return {
        requestId: (req as express.Request).requestId
      };
    }
  })
);

app.use(helmet());
app.use(cors(corsOptions));
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: "draft-7",
    legacyHeaders: false
  })
);
app.use(compression());
app.use(cookieParser());
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

app.get("/", (_req, res) => {
  res.status(200).json({
    success: true,
    service: "ChatRealtime API",
    docs: "/docs"
  });
});

app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use(env.API_PREFIX, apiRouter);

app.use(notFoundMiddleware);
app.use(errorHandlerMiddleware);
