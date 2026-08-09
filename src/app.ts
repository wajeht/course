import path from "node:path";

import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { compress } from "hono/compress";
import { requestId } from "hono/request-id";
import { proxy } from "hono/proxy";
import { secureHeaders } from "hono/secure-headers";
import { trimTrailingSlash } from "hono/trailing-slash";

import type { AppContext } from "./context.js";
import { createApiRouter } from "./routes/api/api.js";
import { createMediaRouter } from "./routes/media/media.js";
import { createMiddleware } from "./routes/middleware.js";

const servicePrefixes = ["/api", "/media", "/covers", "/hls", "/healthz"];

function isServicePath(requestPath: string): boolean {
  return servicePrefixes.some(
    (prefix) => requestPath === prefix || requestPath.startsWith(`${prefix}/`),
  );
}

export function createApp(context: AppContext) {
  const app = new Hono();
  const middleware = createMiddleware(context.logger, context.configuration.app.env);

  app.use("*", trimTrailingSlash());
  app.use("*", requestId());
  app.use("*", middleware.requestLogger);
  app.use("*", compress());
  app.use(
    "*",
    secureHeaders({
      contentSecurityPolicy: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "blob:"],
        mediaSrc: ["'self'", "blob:"],
        connectSrc:
          context.configuration.app.env === "development" ? ["'self'", "ws:"] : ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
      },
    }),
  );
  app.use("/api/*", middleware.apiCache);

  const routedApp = app
    .get("/healthz", (c) => c.json({ status: "ok" }))
    .route("/api", createApiRouter(context))
    .route("/", createMediaRouter(context));

  if (context.configuration.app.env === "production") {
    const clientDirectory = context.configuration.app.clientDirectory;
    routedApp.use("/assets/*", async (c, next) => {
      c.header("Cache-Control", "public, max-age=31536000, immutable");
      await next();
    });
    routedApp.use("/assets/*", serveStatic({ root: clientDirectory }));
    routedApp.get("*", async (c, next) => {
      if (isServicePath(c.req.path) || path.extname(c.req.path)) return next();
      c.header("Cache-Control", "no-cache");
      return serveStatic({ path: path.join(clientDirectory, "index.html") })(c, next);
    });
  } else if (context.configuration.app.env === "development") {
    routedApp.all("*", (c, next) => {
      if (isServicePath(c.req.path)) return next();
      const target = new URL(c.req.url);
      target.protocol = "http:";
      target.hostname = "127.0.0.1";
      target.port = String(context.configuration.app.vuePort);
      return proxy(target, {
        raw: c.req.raw,
        headers: {
          ...c.req.header(),
          host: `localhost:${context.configuration.app.vuePort}`,
        },
      });
    });
  }

  routedApp.notFound(middleware.notFound);
  routedApp.onError(middleware.onError);
  return routedApp;
}

export type AppType = ReturnType<typeof createApp>;
