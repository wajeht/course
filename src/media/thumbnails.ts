import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

import type { Configuration } from "../config.js";
import type { Logger } from "../logger.js";
import { resolveContainedPath } from "./path.js";
import type { VideoRecord } from "./types.js";

const execFileAsync = promisify(execFile);
const thumbnailConcurrency = 2;

export interface ThumbnailMeta {
  modifiedAt: string;
  sizeBytes: number;
}

export type ThumbnailGenerator = (
  sourceVideo: string,
  destination: string,
  durationSeconds: number,
  ffmpegPath: string,
) => Promise<void>;

export interface ThumbnailCache {
  thumbnailPath(videoId: string): string;
  listThumbnailIds(): Promise<Set<string>>;
  synchronize(videos: VideoRecord[]): Promise<void>;
}

export function thumbnailSeekSeconds(durationSeconds: number): number {
  if (durationSeconds <= 1) return 0;
  return Math.min(3, Math.round(durationSeconds * 100) / 1000);
}

export function thumbnailPath(directory: string, videoId: string): string {
  return path.join(directory, `${videoId}.jpg`);
}

export async function generateThumbnail(
  sourceVideo: string,
  destination: string,
  durationSeconds: number,
  ffmpegPath: string,
): Promise<void> {
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await execFileAsync(
    ffmpegPath,
    [
      "-v",
      "error",
      "-ss",
      String(thumbnailSeekSeconds(durationSeconds)),
      "-i",
      sourceVideo,
      "-frames:v",
      "1",
      "-vf",
      "scale=640:-2",
      "-q:v",
      "3",
      "-an",
      "-y",
      destination,
    ],
    { timeout: 60_000 },
  );
}

export function createThumbnailCache({
  configuration,
  logger,
  generate = generateThumbnail,
}: {
  configuration: Configuration;
  logger: Logger;
  generate?: ThumbnailGenerator;
}): ThumbnailCache {
  const directory = configuration.media.thumbnailsDirectory;

  function metaPath(videoId: string): string {
    return path.join(directory, `${videoId}.json`);
  }

  async function readMeta(videoId: string): Promise<ThumbnailMeta | null> {
    try {
      return JSON.parse(await fs.readFile(metaPath(videoId), "utf8")) as ThumbnailMeta;
    } catch {
      return null;
    }
  }

  async function isCurrent(video: VideoRecord): Promise<boolean> {
    try {
      await fs.access(thumbnailPath(directory, video.id));
    } catch {
      return false;
    }
    const meta = await readMeta(video.id);
    return meta?.modifiedAt === video.modifiedAt && meta.sizeBytes === video.sizeBytes;
  }

  async function removeThumbnail(videoId: string): Promise<void> {
    await Promise.all([
      fs.rm(thumbnailPath(directory, videoId), { force: true }),
      fs.rm(metaPath(videoId), { force: true }),
    ]);
  }

  return {
    thumbnailPath: (videoId) => thumbnailPath(directory, videoId),

    async listThumbnailIds() {
      try {
        const entries = await fs.readdir(directory);
        return new Set(
          entries.flatMap((name) => {
            const videoId = thumbnailVideoId(name);
            return videoId && name.endsWith(".jpg") ? [videoId] : [];
          }),
        );
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") return new Set();
        throw error;
      }
    },

    async synchronize(videos) {
      await fs.mkdir(directory, { recursive: true });
      const retained = new Set(videos.map((video) => video.id));
      let existing: string[] = [];
      try {
        existing = await fs.readdir(directory);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      }
      for (const name of existing) {
        const videoId = thumbnailVideoId(name);
        if (videoId && !retained.has(videoId))
          await fs.rm(path.join(directory, name), { force: true });
      }

      const stale = [];
      for (const video of videos) {
        if (video.coverPath) continue;
        if (!(await isCurrent(video))) stale.push(video);
      }
      if (stale.length === 0) return;

      logger.info("Generating video thumbnails", { count: stale.length });
      await mapLimit(stale, thumbnailConcurrency, async (video) => {
        try {
          const source = await resolveContainedPath(
            configuration.media.videosDirectory,
            video.path,
          );
          await generate(
            source,
            thumbnailPath(directory, video.id),
            video.durationSeconds,
            configuration.media.ffmpegPath,
          );
          await fs.writeFile(
            metaPath(video.id),
            JSON.stringify({
              modifiedAt: video.modifiedAt,
              sizeBytes: video.sizeBytes,
            } satisfies ThumbnailMeta),
          );
        } catch (error) {
          logger.warn("Could not generate thumbnail", {
            videoId: video.id,
            path: video.path,
            error,
          });
          await removeThumbnail(video.id);
        }
      });
    },
  };
}

function thumbnailVideoId(filename: string): string | null {
  const match = /^([a-f0-9]{24})\.(jpg|json)$/.exec(filename);
  return match?.[1] ?? null;
}

async function mapLimit<T>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  const executing = new Set<Promise<void>>();
  for (const item of items) {
    const pending = worker(item).finally(() => executing.delete(pending));
    executing.add(pending);
    if (executing.size >= limit) await Promise.race(executing);
  }
  await Promise.all(executing);
}
