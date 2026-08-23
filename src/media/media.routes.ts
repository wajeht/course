import { createReadStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";

import { zValidator } from "@hono/zod-validator";
import { Hono, type Context } from "hono";
import { z } from "zod";

import type { AppContext } from "../context.js";
import { createRequireAuth } from "../auth/auth.routes.js";
import { playlistParametersSchema, videoParametersSchema } from "../library/library.schema.js";
import { resolveContainedPath } from "./path.js";
import { parseByteRange } from "./range.js";

const hlsParametersSchema = z.object({
  videoId: videoParametersSchema.shape.videoId,
  filename: z.string().regex(/^(?:index\.m3u8|segment-\d{5}\.ts)$/),
});

const videoContentTypes: Record<string, string> = {
  ".mp4": "video/mp4",
  ".m4v": "video/x-m4v",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".mkv": "video/x-matroska",
  ".avi": "video/x-msvideo",
  ".mpeg": "video/mpeg",
  ".mpg": "video/mpeg",
};

function createFileBody(filename: string, range?: { start: number; end: number }): ReadableStream {
  return Readable.toWeb(createReadStream(filename, range)) as ReadableStream;
}

function coverContentType(filename: string): string {
  const extension = path.extname(filename).toLowerCase();
  if (extension === ".png") return "image/png";
  if (extension === ".webp") return "image/webp";
  return "image/jpeg";
}

async function sendCoverImage(c: Context, filename: string): Promise<Response> {
  const statistics = await fs.stat(filename);
  c.header("Content-Type", coverContentType(filename));
  c.header("Content-Length", String(statistics.size));
  c.header("Cache-Control", "private, max-age=31536000, immutable");
  c.header("Vary", "Cookie");
  return c.body(createFileBody(filename));
}

async function trySendCover(
  c: Context,
  root: string,
  relativePath: string,
): Promise<Response | null> {
  try {
    return await sendCoverImage(c, await resolveContainedPath(root, relativePath));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

export function createMediaRouter(context: AppContext) {
  const app = new Hono();
  const requireAuth = createRequireAuth(context);

  app.get("/media/:videoId", requireAuth, zValidator("param", videoParametersSchema), async (c) => {
    const video = await context.library.findVideoRecord(c.req.valid("param").videoId);
    if (!video) return c.json({ message: "Video not found" }, 404);
    const filename = await resolveContainedPath(
      context.configuration.media.videosDirectory,
      video.path,
    );
    const statistics = await fs.stat(filename);
    const contentType =
      videoContentTypes[path.extname(filename).toLowerCase()] ?? "application/octet-stream";
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
  });

  app.get(
    "/covers/playlists/:playlistId",
    requireAuth,
    zValidator("param", playlistParametersSchema),
    async (c) => {
      const playlist = await context.libraryRepository.findPlaylist(
        c.req.valid("param").playlistId,
      );
      if (!playlist) return c.body(null, 404);
      const videosDirectory = context.configuration.media.videosDirectory;
      if (playlist.cover_path) {
        const cover = await trySendCover(c, videosDirectory, playlist.cover_path);
        if (cover) return cover;
      }
      if (playlist.first_video_cover_path) {
        const cover = await trySendCover(c, videosDirectory, playlist.first_video_cover_path);
        if (cover) return cover;
      }
      if (playlist.first_video_id) {
        const cover = await trySendCover(
          c,
          context.configuration.media.thumbnailsDirectory,
          `${playlist.first_video_id}.jpg`,
        );
        if (cover) return cover;
      }
      return c.body(null, 404);
    },
  );

  app.get(
    "/covers/videos/:videoId",
    requireAuth,
    zValidator("param", videoParametersSchema),
    async (c) => {
      const video = await context.libraryRepository.findVideo(c.req.valid("param").videoId);
      if (!video) return c.body(null, 404);
      const videosDirectory = context.configuration.media.videosDirectory;
      if (video.cover_path) {
        const cover = await trySendCover(c, videosDirectory, video.cover_path);
        if (cover) return cover;
      }
      const thumbnail = await trySendCover(
        c,
        context.configuration.media.thumbnailsDirectory,
        `${video.id}.jpg`,
      );
      if (thumbnail) return thumbnail;
      if (video.playlist_cover_path) {
        const cover = await trySendCover(c, videosDirectory, video.playlist_cover_path);
        if (cover) return cover;
      }
      return c.body(null, 404);
    },
  );

  app.get(
    "/hls/:videoId/:filename",
    requireAuth,
    zValidator("param", hlsParametersSchema),
    async (c) => {
      const { videoId, filename } = c.req.valid("param");
      try {
        const file = await resolveContainedPath(
          path.join(context.configuration.media.hlsDirectory, videoId),
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
        if ((error as NodeJS.ErrnoException).code === "ENOENT") return c.body(null, 404);
        throw error;
      }
    },
  );

  return app;
}
