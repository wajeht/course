import { createReadStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";

import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";

import type { AppContext } from "../../context.js";
import { resolveContainedPath } from "../../media/path.js";
import { createRequireAuth } from "../api/auth/auth.js";
import { identifierSchema, lessonParametersSchema } from "../api/catalog/catalog.schema.js";
import { parseByteRange } from "./range.js";

const hlsParametersSchema = z.object({
  lessonId: identifierSchema,
  filename: z.string().regex(/^(?:index\.m3u8|segment-\d{5}\.ts)$/),
});

const videoContentTypes = new Map([
  [".mp4", "video/mp4"],
  [".m4v", "video/x-m4v"],
  [".webm", "video/webm"],
  [".mov", "video/quicktime"],
  [".mkv", "video/x-matroska"],
  [".avi", "video/x-msvideo"],
  [".mpeg", "video/mpeg"],
  [".mpg", "video/mpeg"],
]);

function createFileBody(filename: string, range?: { start: number; end: number }): ReadableStream {
  // SAFETY: Node's web stream is compatible with the Fetch ReadableStream accepted by Hono.
  return Readable.toWeb(createReadStream(filename, range)) as ReadableStream;
}

export function createMediaRouter(context: AppContext) {
  const app = new Hono();
  const requireAuth = createRequireAuth(context);

  app.get(
    "/media/:lessonId",
    requireAuth,
    zValidator("param", lessonParametersSchema),
    async (c) => {
      const lesson = await context.catalog.findLessonRecord(c.req.valid("param").lessonId);
      if (!lesson) return c.json({ message: "Lesson not found" }, 404);
      const filename = await resolveContainedPath(
        context.configuration.media.videosDirectory,
        lesson.path,
      );
      const statistics = await fs.stat(filename);
      const contentType =
        videoContentTypes.get(path.extname(filename).toLowerCase()) ?? "application/octet-stream";
      c.header("Accept-Ranges", "bytes");
      c.header("Content-Type", contentType);
      c.header("Cache-Control", "private, no-store");

      try {
        const range = parseByteRange(c.req.header("range"), statistics.size);
        if (!range) {
          c.header("Content-Length", String(statistics.size));
          return c.body(createFileBody(filename));
        }
        c.header("Content-Range", `bytes ${range.start}-${range.end}/${statistics.size}`);
        c.header("Content-Length", String(range.end - range.start + 1));
        return c.body(createFileBody(filename, range), 206);
      } catch (error) {
        if (!(error instanceof RangeError)) throw error;
        c.header("Content-Range", `bytes */${statistics.size}`);
        return c.body(null, 416);
      }
    },
  );

  app.get(
    "/covers/:courseId",
    requireAuth,
    zValidator("param", z.object({ courseId: identifierSchema })),
    async (c) => {
      const course = await context.catalogRepository.findCourse(c.req.valid("param").courseId);
      if (!course?.cover_path || !course.cover_origin) return c.body(null, 404);
      const root =
        course.cover_origin === "videos"
          ? context.configuration.media.videosDirectory
          : context.configuration.media.generatedCoversDirectory;
      const filename = await resolveContainedPath(root, course.cover_path);
      const statistics = await fs.stat(filename);
      const extension = path.extname(filename).toLowerCase();
      const contentType =
        extension === ".png" ? "image/png" : extension === ".webp" ? "image/webp" : "image/jpeg";
      c.header("Content-Type", contentType);
      c.header("Content-Length", String(statistics.size));
      c.header("Cache-Control", "private, no-store");
      return c.body(createFileBody(filename));
    },
  );

  app.get(
    "/hls/:lessonId/:filename",
    requireAuth,
    zValidator("param", hlsParametersSchema),
    async (c) => {
      const { lessonId, filename } = c.req.valid("param");
      try {
        const file = await resolveContainedPath(
          path.join(context.configuration.media.hlsDirectory, lessonId),
          filename,
        );
        const statistics = await fs.stat(file);
        c.header(
          "Content-Type",
          filename.endsWith(".m3u8") ? "application/vnd.apple.mpegurl" : "video/mp2t",
        );
        c.header("Cache-Control", "private, no-store");
        c.header("Content-Length", String(statistics.size));
        return c.body(createFileBody(file));
      } catch (error) {
        if (error instanceof Error && "code" in error && error.code === "ENOENT")
          return c.body(null, 404);
        throw error;
      }
    },
  );

  return app;
}
