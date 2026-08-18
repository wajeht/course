import { Hono } from "hono";

import type { AppContext } from "../../context.js";
import { createAuthRouter, createRequireAuth } from "../../auth/auth.routes.js";
import { createCatalogRouter } from "../../catalog/catalog.routes.js";
import { createPlaybackRouter } from "./playback/playback.js";
import { createProgressRouter } from "./progress/progress.js";
import { createScanRouter } from "./scan/scan.js";
import { createSettingsRouter } from "./settings/settings.js";

export function createApiRouter(context: AppContext) {
  return new Hono()
    .route("/auth", createAuthRouter(context))
    .use("*", createRequireAuth(context))
    .route("/catalog", createCatalogRouter(context))
    .route("/progress", createProgressRouter(context))
    .route("/playback", createPlaybackRouter(context))
    .route("/settings", createSettingsRouter(context))
    .route("/scan", createScanRouter(context));
}
