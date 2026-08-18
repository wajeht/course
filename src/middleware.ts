import type { ErrorHandler, MiddlewareHandler, NotFoundHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import { ZodError } from "zod";

import type { AppEnvironment } from "./config.js";
import type { Logger } from "./logger.js";

export function createMiddleware(
  logger: Logger,
  environment: AppEnvironment,
): {
  requestLogger: MiddlewareHandler;
  apiCache: MiddlewareHandler;
  notFound: NotFoundHandler;
  onError: ErrorHandler;
} {
  return {
    requestLogger: async (c, next) => {
      const start = performance.now();
      await next();
      logger.info("request", {
        requestId: c.get("requestId"),
        method: c.req.method,
        path: c.req.path,
        status: c.res.status,
        durationMs: Math.round(performance.now() - start),
      });
    },
    apiCache: async (c, next) => {
      c.header("Cache-Control", "private, no-store");
      await next();
    },
    notFound: (c) =>
      c.req.path === "/api" || c.req.path.startsWith("/api/")
        ? c.json({ message: "Resource not found" }, 404)
        : c.text("Not found", 404),
    onError: (error, c) => {
      const status =
        error instanceof HTTPException ? error.status : error instanceof ZodError ? 400 : 500;
      if (status >= 500) logger.error("request failed", { error, path: c.req.path });
      const message =
        status === 500 && environment === "production"
          ? "The server could not complete the request"
          : error.message;
      return c.json({ message }, status);
    },
  };
}
