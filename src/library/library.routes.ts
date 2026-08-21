import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";

import type { AppContext } from "../context.js";
import {
  libraryQuerySchema,
  libraryResponseSchema,
  videoDetailEnvelopeSchema,
  videoParametersSchema,
} from "./library.schema.js";

export function createLibraryRouter(context: AppContext) {
  return new Hono().get("/", zValidator("query", libraryQuerySchema), async (c) =>
    c.json(libraryResponseSchema.parse(await context.library.getLibrary(c.req.valid("query")))),
  );
}

export function createVideoRouter(context: AppContext) {
  return new Hono().get(
    "/:videoId",
    zValidator("param", videoParametersSchema, (result, c) => {
      if (!result.success) return c.json({ message: "Video not found" }, 404);
    }),
    async (c) => {
      const video = await context.library.getVideo(c.req.valid("param").videoId);
      return video
        ? c.json(videoDetailEnvelopeSchema.parse(video))
        : c.json({ message: "Video not found" }, 404);
    },
  );
}
