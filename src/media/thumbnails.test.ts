import fs from "node:fs/promises";
import path from "node:path";

import { describe, expect, it, vi } from "vitest";

import { createConfiguration } from "../config.js";
import { createLogger } from "../logger.js";
import { createTemporaryDirectory } from "../test/resources.js";
import {
  chapterThumbnailPath,
  chapterThumbnailSeeks,
  createThumbnailCache,
  thumbnailPath,
  thumbnailSeekSeconds,
  type ThumbnailGenerator,
} from "./thumbnails.js";
import type { VideoRecord } from "./types.js";

const videoA = "a".repeat(24);
const videoB = "b".repeat(24);

function videoRecord(id: string, filename: string, coverPath: string | null = null): VideoRecord {
  return {
    id,
    path: filename,
    playlistId: null,
    playlistSectionId: null,
    title: filename,
    description: "",
    tags: [],
    coverPath,
    sourceProvider: null,
    sourceUrl: null,
    sortOrder: 0,
    durationSeconds: 60,
    sizeBytes: 100,
    container: "mp4",
    videoCodec: "h264",
    audioCodec: "aac",
    browserCompatible: true,
    modifiedAt: "2026-08-21T00:00:00.000Z",
  };
}

async function createCache(generate?: ThumbnailGenerator) {
  const directory = await createTemporaryDirectory("video-thumbnails-");
  const videosDirectory = path.join(directory, "videos");
  const dataDirectory = path.join(directory, "data");
  await Promise.all([
    fs.mkdir(videosDirectory, { recursive: true }),
    fs.mkdir(dataDirectory, { recursive: true }),
  ]);
  await fs.writeFile(path.join(videosDirectory, "A.mp4"), "video-a");
  await fs.writeFile(path.join(videosDirectory, "B.mp4"), "video-b");
  const configuration = createConfiguration({
    APP_ENV: "testing",
    VIDEOS_DIR: videosDirectory,
    DATA_DIR: dataDirectory,
  });
  const logger = createLogger();
  const warn = vi.spyOn(logger, "warn");
  const cache = createThumbnailCache({
    configuration,
    logger,
    generate:
      generate ??
      (async (_source, destination) => {
        await fs.mkdir(path.dirname(destination), { recursive: true });
        await fs.writeFile(destination, "thumb");
      }),
  });
  return { cache, configuration, warn };
}

describe("thumbnails", () => {
  it("seeks past short intros, using a later chapter when available", () => {
    expect(thumbnailSeekSeconds(0.5)).toBe(0);
    expect(thumbnailSeekSeconds(20)).toBe(6);
    expect(thumbnailSeekSeconds(60)).toBe(25);
    expect(thumbnailSeekSeconds(2500)).toBe(90);
    expect(
      chapterThumbnailSeeks([
        { videoId: videoA, startSeconds: 0, sortOrder: 0 },
        { videoId: videoA, startSeconds: 130, sortOrder: 1 },
      ]).get(videoA),
    ).toBe(130);
  });

  it("generates posters even when a video has an authored cover", async () => {
    const generate = vi.fn<ThumbnailGenerator>(async (_source, destination) => {
      await fs.mkdir(path.dirname(destination), { recursive: true });
      await fs.writeFile(destination, "thumb");
    });
    const { cache, configuration } = await createCache(generate);

    await cache.synchronize([videoRecord(videoA, "A.mp4"), videoRecord(videoB, "B.mp4", "B.jpg")]);

    expect(generate).toHaveBeenCalledTimes(2);
    await expect(
      fs.readFile(thumbnailPath(configuration.media.thumbnailsDirectory, videoA), "utf8"),
    ).resolves.toBe("thumb");
    await expect(
      fs.readFile(thumbnailPath(configuration.media.thumbnailsDirectory, videoB), "utf8"),
    ).resolves.toBe("thumb");
    const revisions = await cache.listThumbnailRevisions();
    expect(new Set(revisions.keys())).toEqual(new Set([videoA, videoB]));
  });

  it("writes a poster for each chapter start time", async () => {
    const generate = vi.fn<ThumbnailGenerator>(async (_source, destination) => {
      await fs.mkdir(path.dirname(destination), { recursive: true });
      await fs.writeFile(destination, path.basename(destination));
    });
    const { cache, configuration } = await createCache(generate);

    await cache.synchronize(
      [videoRecord(videoA, "A.mp4")],
      [
        { videoId: videoA, startSeconds: 0, sortOrder: 0 },
        { videoId: videoA, startSeconds: 130, sortOrder: 1 },
      ],
    );

    await expect(cache.listChapterStarts(videoA)).resolves.toEqual([0, 130]);
    await expect(
      fs.readFile(
        chapterThumbnailPath(configuration.media.thumbnailsDirectory, videoA, 130),
        "utf8",
      ),
    ).resolves.toBe(`${videoA}.c130.jpg`);
  });

  it("reuses a current thumbnail and regenerates when the source changes", async () => {
    const generate = vi.fn<ThumbnailGenerator>(async (_source, destination, _duration, _ffmpeg) => {
      await fs.mkdir(path.dirname(destination), { recursive: true });
      await fs.writeFile(destination, `thumb-${generate.mock.calls.length}`);
    });
    const { cache } = await createCache(generate);
    const video = videoRecord(videoA, "A.mp4");

    await cache.synchronize([video]);
    await cache.synchronize([video]);
    expect(generate).toHaveBeenCalledTimes(1);
    expect(generate.mock.calls[0]?.[2]).toBe(25);

    await cache.synchronize([{ ...video, sizeBytes: 200 }]);
    expect(generate).toHaveBeenCalledTimes(2);
  });

  it("restores a missing chapter thumbnail", async () => {
    const generate = vi.fn<ThumbnailGenerator>(async (_source, destination) => {
      await fs.mkdir(path.dirname(destination), { recursive: true });
      await fs.writeFile(destination, "thumb");
    });
    const { cache, configuration } = await createCache(generate);
    const video = videoRecord(videoA, "A.mp4");
    const chapters = [{ videoId: videoA, startSeconds: 30, sortOrder: 0 }];
    const chapterPath = chapterThumbnailPath(configuration.media.thumbnailsDirectory, videoA, 30);

    await cache.synchronize([video], chapters);
    await fs.rm(chapterPath);
    await cache.synchronize([video], chapters);

    expect(generate).toHaveBeenCalledTimes(4);
    await expect(fs.access(chapterPath)).resolves.toBeUndefined();
  });

  it("forces regeneration of the poster and all chapter thumbnails", async () => {
    const generate = vi.fn<ThumbnailGenerator>(async (_source, destination) => {
      await fs.mkdir(path.dirname(destination), { recursive: true });
      await fs.writeFile(destination, `thumb-${generate.mock.calls.length}`);
    });
    const { cache } = await createCache(generate);
    const video = videoRecord(videoA, "A.mp4");
    const chapters = [{ videoId: videoA, startSeconds: 30, sortOrder: 0 }];

    await cache.synchronize([video], chapters);
    await cache.regenerate(video, chapters);

    expect(generate).toHaveBeenCalledTimes(4);
  });

  it("prunes thumbnails for videos that left the library", async () => {
    const { cache, configuration } = await createCache();
    await cache.synchronize([videoRecord(videoA, "A.mp4"), videoRecord(videoB, "B.mp4")]);
    await cache.synchronize([videoRecord(videoA, "A.mp4")]);

    const revisions = await cache.listThumbnailRevisions();
    expect(new Set(revisions.keys())).toEqual(new Set([videoA]));
    await expect(
      fs.access(thumbnailPath(configuration.media.thumbnailsDirectory, videoB)),
    ).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("swallows generation failures without failing the scan", async () => {
    const { cache, warn } = await createCache(async () => {
      throw new Error("FFmpeg failed");
    });

    await expect(cache.synchronize([videoRecord(videoA, "A.mp4")])).resolves.toBeUndefined();
    await expect(cache.listThumbnailRevisions()).resolves.toEqual(new Map());
    expect(warn).toHaveBeenCalledWith(
      "Could not generate thumbnail",
      expect.objectContaining({ videoId: videoA }),
    );
  });
});
