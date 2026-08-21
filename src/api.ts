import { Hono } from "hono";

import type { AppContext } from "./context.js";
import { createAuthRouter, createRequireAuth } from "./auth/auth.routes.js";
import {
  createLibraryRouter,
  createPlaylistRouter,
  createVideoRouter,
} from "./library/library.routes.js";
import { createScanRouter } from "./media/scan.routes.js";
import { createPlaybackRouter } from "./playback/playback.routes.js";
import { createProgressRouter } from "./progress/progress.routes.js";
import { createSettingsRouter } from "./settings/settings.routes.js";

export function createApiRouter(context: AppContext) {
  return new Hono()
    .route("/auth", createAuthRouter(context))
    .use("*", createRequireAuth(context))
    .route("/library", createLibraryRouter(context))
    .route("/playlists", createPlaylistRouter(context))
    .route("/videos", createVideoRouter(context))
    .route("/progress", createProgressRouter(context))
    .route("/playback", createPlaybackRouter(context))
    .route("/settings", createSettingsRouter(context))
    .route("/scan", createScanRouter(context));
}
