import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";

import type { AppContext } from "../../../context.js";
import { playbackParametersSchema, playbackResponseSchema } from "./playback.schema.js";

export function createPlaybackRouter(context: AppContext) {
  return new Hono()
    .get("/:lessonId", zValidator("param", playbackParametersSchema), async (c) => {
      const playback = await context.playback.playback(c.req.valid("param").lessonId);
      return playback
        ? c.json(playbackResponseSchema.parse(playback))
        : c.json({ message: "Lesson not found" }, 404);
    })
    .get("/:lessonId/conversion", zValidator("param", playbackParametersSchema), async (c) => {
      const playback = await context.playback.conversion(c.req.valid("param").lessonId);
      return playback
        ? c.json(playbackResponseSchema.parse(playback))
        : c.json({ message: "Conversion not found" }, 404);
    })
    .post("/:lessonId/retry", zValidator("param", playbackParametersSchema), async (c) => {
      const playback = await context.playback.retry(c.req.valid("param").lessonId);
      return playback
        ? c.json(playbackResponseSchema.parse(playback))
        : c.json({ message: "Lesson not found" }, 404);
    });
}
