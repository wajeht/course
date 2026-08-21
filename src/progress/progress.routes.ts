import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";

import type { AppContext } from "../context.js";
import {
  courseProgressParametersSchema,
  progressParametersSchema,
  updateProgressSchema,
} from "./progress.schema.js";

export function createProgressRouter(context: AppContext) {
  return new Hono()
    .post("/videos/:lessonId/open", zValidator("param", progressParametersSchema), async (c) => {
      const opened = await context.progress.openLesson(c.req.valid("param").lessonId);
      return opened ? c.json({ opened: true }) : c.json({ message: "Video not found" }, 404);
    })
    .put(
      "/videos/:lessonId",
      zValidator("param", progressParametersSchema),
      zValidator("json", updateProgressSchema),
      async (c) => {
        const saved = await context.progress.updateProgress(
          c.req.valid("param").lessonId,
          c.req.valid("json").positionSeconds,
        );
        return saved ? c.json({ saved: true }) : c.json({ message: "Video not found" }, 404);
      },
    )
    .post(
      "/videos/:lessonId/complete",
      zValidator("param", progressParametersSchema),
      async (c) => {
        const saved = await context.progress.completeLesson(c.req.valid("param").lessonId);
        return saved ? c.json({ completed: true }) : c.json({ message: "Video not found" }, 404);
      },
    )
    .delete("/videos/:lessonId", zValidator("param", progressParametersSchema), async (c) => {
      await context.progress.resetLesson(c.req.valid("param").lessonId);
      return c.json({ reset: true });
    })
    .delete(
      "/playlists/:courseId",
      zValidator("param", courseProgressParametersSchema),
      async (c) => {
        await context.progress.resetCourse(c.req.valid("param").courseId);
        return c.json({ reset: true });
      },
    );
}
