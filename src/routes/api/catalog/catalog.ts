import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";

import type { AppContext } from "../../../context.js";
import {
  catalogQuerySchema,
  catalogResponseSchema,
  courseDetailResponseSchema,
  courseParametersSchema,
  lessonDetailResponseSchema,
  lessonParametersSchema,
} from "./catalog.schema.js";

export function createCatalogRouter(context: AppContext) {
  return new Hono()
    .get("/", zValidator("query", catalogQuerySchema), async (c) => {
      const filters = c.req.valid("query");
      return c.json(catalogResponseSchema.parse(await context.catalog.getCatalog(filters)));
    })
    .get(
      "/courses/:courseId",
      zValidator("param", courseParametersSchema, (result, c) => {
        if (!result.success) return c.json({ message: "Course not found" }, 404);
      }),
      async (c) => {
        const result = await context.catalog.getCourse(c.req.valid("param").courseId);
        return result
          ? c.json(courseDetailResponseSchema.parse(result))
          : c.json({ message: "Course not found" }, 404);
      },
    )
    .get(
      "/lessons/:lessonId",
      zValidator("param", lessonParametersSchema, (result, c) => {
        if (!result.success) return c.json({ message: "Lesson not found" }, 404);
      }),
      async (c) => {
        const result = await context.catalog.getLesson(c.req.valid("param").lessonId);
        return result
          ? c.json(lessonDetailResponseSchema.parse(result))
          : c.json({ message: "Lesson not found" }, 404);
      },
    );
}
