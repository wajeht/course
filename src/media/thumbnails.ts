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

export const thumbnailCacheVersion = 2;

export interface ThumbnailMeta {
  modifiedAt: string;
  sizeBytes: number;
  version: number;
  chapterStarts: number[];
}

export type ThumbnailGenerator = (
  sourceVideo: string,
  destination: string,
  seekSeconds: number,
  ffmpegPath: string,
) => Promise<void>;

export interface ThumbnailChapter {
  videoId: string;
  startSeconds: number;
  sortOrder?: number;
}

export interface ThumbnailIndex {
  revisions: Map<string, number>;
  chapterStartsByVideo: Map<string, number[]>;
}

export interface ThumbnailCache {
  listThumbnailIndex(): Promise<ThumbnailIndex>;
  synchronize(videos: VideoRecord[], chapters?: ThumbnailChapter[]): Promise<void>;
  regenerate(video: VideoRecord, chapters?: ThumbnailChapter[]): Promise<void>;
}

export function thumbnailSeekSeconds(durationSeconds: number): number {
  if (durationSeconds <= 2) return 0;
  if (durationSeconds < 40) return Math.round(durationSeconds * 30) / 100;
  return Math.min(90, Math.max(25, Math.round(durationSeconds * 0.12)));
}

export function chapterThumbnailSeeks(
  chapters: Array<{ videoId: string; startSeconds: number; sortOrder?: number }>,
): Map<string, number> {
  const grouped = new Map<string, Array<{ startSeconds: number; sortOrder: number }>>();
  for (const chapter of chapters) {
    const list = grouped.get(chapter.videoId) ?? [];
    list.push({ startSeconds: chapter.startSeconds, sortOrder: chapter.sortOrder ?? 0 });
    grouped.set(chapter.videoId, list);
  }
  const seeks = new Map<string, number>();
  for (const [videoId, list] of grouped) {
    list.sort((left, right) => left.sortOrder - right.sortOrder);
    const afterIntro = list.find((chapter) => chapter.startSeconds >= 20) ?? list[1];
    if (afterIntro && afterIntro.startSeconds > 0) seeks.set(videoId, afterIntro.startSeconds);
  }
  return seeks;
}

export function thumbnailPath(directory: string, videoId: string): string {
  return path.join(directory, `${videoId}.jpg`);
}

export function chapterThumbnailPath(
  directory: string,
  videoId: string,
  startSeconds: number,
): string {
  return path.join(directory, `${videoId}.c${startSeconds}.jpg`);
}

export async function generateThumbnail(
  sourceVideo: string,
  destination: string,
  seekSeconds: number,
  ffmpegPath: string,
): Promise<void> {
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await execFileAsync(
    ffmpegPath,
    [
      "-v",
      "error",
      "-ss",
      String(seekSeconds),
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

  function chaptersByVideo(chapters: ThumbnailChapter[]): Map<string, number[]> {
    const starts = new Map<string, number[]>();
    for (const chapter of chapters) {
      const list = starts.get(chapter.videoId) ?? [];
      list.push(chapter.startSeconds);
      starts.set(chapter.videoId, list);
    }
    for (const [videoId, list] of starts) {
      starts.set(
        videoId,
        [...new Set(list)].sort((left, right) => left - right),
      );
    }
    return starts;
  }

  async function isCurrent(video: VideoRecord, chapterStarts: number[]): Promise<boolean> {
    try {
      await Promise.all([
        fs.access(thumbnailPath(directory, video.id)),
        ...chapterStarts.map((startSeconds) =>
          fs.access(chapterThumbnailPath(directory, video.id, startSeconds)),
        ),
      ]);
    } catch {
      return false;
    }
    const meta = await readMeta(video.id);
    return (
      meta?.version === thumbnailCacheVersion &&
      meta.modifiedAt === video.modifiedAt &&
      meta.sizeBytes === video.sizeBytes &&
      sameNumberList(meta.chapterStarts ?? [], chapterStarts)
    );
  }

  async function removeThumbnail(videoId: string): Promise<void> {
    let existing: string[] = [];
    try {
      existing = await fs.readdir(directory);
    } catch {
      existing = [];
    }
    await Promise.all(
      existing
        .filter((name) => thumbnailOwnerId(name) === videoId)
        .map((name) => fs.rm(path.join(directory, name), { force: true })),
    );
  }

  async function writeVideoThumbnails(
    video: VideoRecord,
    chapterStarts: number[],
    chapterSeeks: Map<string, number>,
  ): Promise<void> {
    const source = await resolveContainedPath(configuration.media.videosDirectory, video.path);
    const seekSeconds = Math.min(
      chapterSeeks.get(video.id) ?? thumbnailSeekSeconds(video.durationSeconds),
      Math.max(0, video.durationSeconds - 1),
    );
    await generate(
      source,
      thumbnailPath(directory, video.id),
      seekSeconds,
      configuration.media.ffmpegPath,
    );
    for (const startSeconds of chapterStarts) {
      await generate(
        source,
        chapterThumbnailPath(directory, video.id, startSeconds),
        Math.min(startSeconds, Math.max(0, video.durationSeconds - 1)),
        configuration.media.ffmpegPath,
      );
    }
    let existing: string[] = [];
    try {
      existing = await fs.readdir(directory);
    } catch {
      existing = [];
    }
    const keep = new Set(chapterStarts);
    await Promise.all(
      existing
        .filter((name) => {
          const startSeconds = chapterStartFromName(video.id, name);
          return startSeconds !== null && !keep.has(startSeconds);
        })
        .map((name) => fs.rm(path.join(directory, name), { force: true })),
    );
    await fs.writeFile(
      metaPath(video.id),
      JSON.stringify({
        modifiedAt: video.modifiedAt,
        sizeBytes: video.sizeBytes,
        version: thumbnailCacheVersion,
        chapterStarts,
      } satisfies ThumbnailMeta),
    );
  }

  return {
    async listThumbnailIndex() {
      try {
        const entries = await fs.readdir(directory);
        const revisions = new Map<string, number>();
        const chapterStartsByVideo = new Map<string, number[]>();
        await Promise.all(
          entries.map(async (name) => {
            const videoId = posterVideoId(name);
            if (videoId) {
              const statistics = await fs.stat(path.join(directory, name));
              revisions.set(videoId, Math.round(statistics.mtimeMs));
              return;
            }
            const chapter = chapterThumbnailFromName(name);
            if (!chapter) return;
            const starts = chapterStartsByVideo.get(chapter.videoId) ?? [];
            starts.push(chapter.startSeconds);
            chapterStartsByVideo.set(chapter.videoId, starts);
          }),
        );
        for (const starts of chapterStartsByVideo.values()) {
          starts.sort((left, right) => left - right);
        }
        return { revisions, chapterStartsByVideo };
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
          return { revisions: new Map(), chapterStartsByVideo: new Map() };
        }
        throw error;
      }
    },

    async synchronize(videos, chapters = []) {
      await fs.mkdir(directory, { recursive: true });
      const retained = new Set(videos.map((video) => video.id));
      let existing: string[] = [];
      try {
        existing = await fs.readdir(directory);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      }
      for (const name of existing) {
        const videoId = thumbnailOwnerId(name);
        if (videoId && !retained.has(videoId))
          await fs.rm(path.join(directory, name), { force: true });
      }

      const startsByVideo = chaptersByVideo(chapters);
      const chapterSeeks = chapterThumbnailSeeks(chapters);
      const stale = [];
      for (const video of videos) {
        if (!(await isCurrent(video, startsByVideo.get(video.id) ?? []))) stale.push(video);
      }
      if (stale.length === 0) return;

      logger.info("Generating video thumbnails", { count: stale.length });
      await mapLimit(stale, thumbnailConcurrency, async (video) => {
        try {
          await writeVideoThumbnails(video, startsByVideo.get(video.id) ?? [], chapterSeeks);
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

    async regenerate(video, chapters = []) {
      await fs.mkdir(directory, { recursive: true });
      await writeVideoThumbnails(
        video,
        chaptersByVideo(chapters).get(video.id) ?? chapters.map((chapter) => chapter.startSeconds),
        chapterThumbnailSeeks(chapters.length ? chapters : []),
      );
    },
  };
}

function posterVideoId(filename: string): string | null {
  const match = /^([a-f0-9]{24})\.jpg$/.exec(filename);
  return match?.[1] ?? null;
}

function thumbnailOwnerId(filename: string): string | null {
  const match = /^([a-f0-9]{24})(?:\.c\d+)?\.(jpg|json)$/.exec(filename);
  return match?.[1] ?? null;
}

function chapterStartFromName(videoId: string, filename: string): number | null {
  const chapter = chapterThumbnailFromName(filename);
  return chapter?.videoId === videoId ? chapter.startSeconds : null;
}

function chapterThumbnailFromName(
  filename: string,
): { videoId: string; startSeconds: number } | null {
  const match = /^([a-f0-9]{24})\.c(\d+)\.jpg$/.exec(filename);
  return match ? { videoId: match[1]!, startSeconds: Number(match[2]) } : null;
}

function sameNumberList(left: number[], right: number[]): boolean {
  if (left.length !== right.length) return false;
  return left.every((value, index) => value === right[index]);
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
