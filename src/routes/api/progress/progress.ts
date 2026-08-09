import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";

import type { AppContext } from "../../../context.js";
import {
  courseProgressParametersSchema,
  progressParametersSchema,
  updateProgressSchema,
} from "./progress.schema.js";

export function createProgressRouter(context: AppContext) {
  return new Hono()
    .put(
      "/lessons/:lessonId",
      zValidator("param", progressParametersSchema),
      zValidator("json", updateProgressSchema),
      async (c) => {
        const saved = await context.progress.update(
          c.req.valid("param").lessonId,
          c.req.valid("json").positionSeconds,
        );
        return saved ? c.json({ saved: true }) : c.json({ message: "Lesson not found" }, 404);
      },
    )
    .post(
      "/lessons/:lessonId/complete",
      zValidator("param", progressParametersSchema),
      async (c) => {
        const saved = await context.progress.complete(c.req.valid("param").lessonId);
        return saved ? c.json({ completed: true }) : c.json({ message: "Lesson not found" }, 404);
      },
    )
    .delete("/lessons/:lessonId", zValidator("param", progressParametersSchema), async (c) => {
      await context.progress.resetLesson(c.req.valid("param").lessonId);
      return c.json({ reset: true });
    })
    .delete(
      "/courses/:courseId",
      zValidator("param", courseProgressParametersSchema),
      async (c) => {
        await context.progress.resetCourse(c.req.valid("param").courseId);
        return c.json({ reset: true });
      },
    );
}
