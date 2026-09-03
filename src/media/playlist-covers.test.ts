import fs from "node:fs/promises";
import path from "node:path";

import { describe, expect, it, vi } from "vitest";

import { createConfiguration } from "../config.js";
import { createLogger } from "../logger.js";
import { createTemporaryDirectory } from "../test/resources.js";
import {
  createPlaylistCoverCache,
  playlistCoverPath,
  type PlaylistCoverGenerator,
} from "./playlist-covers.js";
import type { PlaylistRecord } from "./types.js";

const playlistId = "a".repeat(24);

function playlistRecord(coverPath: string | null = "Playlist/cover.jpg"): PlaylistRecord {
  return {
    id: playlistId,
    path: "Playlist",
    title: "Playlist",
    description: "",
    tags: [],
    coverPath,
    sourceProvider: null,
    sourceUrl: null,
    sortOrder: 0,
  };
}

async function createCache(generate?: PlaylistCoverGenerator) {
  const directory = await createTemporaryDirectory("playlist-covers-");
  const videosDirectory = path.join(directory, "videos");
  const dataDirectory = path.join(directory, "data");
  const source = path.join(videosDirectory, "Playlist", "cover.jpg");
  await fs.mkdir(path.dirname(source), { recursive: true });
  await fs.writeFile(source, "original-cover");
  const configuration = createConfiguration({
    APP_ENV: "testing",
    VIDEOS_DIR: videosDirectory,
    DATA_DIR: dataDirectory,
  });
  const logger = createLogger();
  const warn = vi.spyOn(logger, "warn");
  const cache = createPlaylistCoverCache({
    configuration,
    logger,
    generate:
      generate ??
      (async (_source, destination) => {
        await fs.mkdir(path.dirname(destination), { recursive: true });
        await fs.writeFile(destination, "optimized-cover");
      }),
  });
  return { cache, configuration, source, warn };
}

describe("playlist covers", () => {
  it("generates an optimized revision and restores its index", async () => {
    const generate = vi.fn<PlaylistCoverGenerator>(async (_source, destination) => {
      await fs.mkdir(path.dirname(destination), { recursive: true });
      await fs.writeFile(destination, "optimized-cover");
    });
    const { cache, configuration, source } = await createCache(generate);

    await cache.synchronize([playlistRecord()]);
    const index = await cache.listPlaylistCoverIndex();
    const revision = index.revisions.get(playlistId)!;

    expect(generate).toHaveBeenCalledWith(await fs.realpath(source), expect.any(String), "ffmpeg");
    await expect(
      fs.readFile(
        playlistCoverPath(configuration.media.playlistCoversDirectory, playlistId, revision),
        "utf8",
      ),
    ).resolves.toBe("optimized-cover");

    const restored = createPlaylistCoverCache({ configuration, logger: createLogger(), generate });
    await expect(restored.listPlaylistCoverIndex()).resolves.toEqual(index);
  });

  it("reuses a current cover and retains one previous revision", async () => {
    const generate = vi.fn<PlaylistCoverGenerator>(async (_source, destination) => {
      await fs.mkdir(path.dirname(destination), { recursive: true });
      await fs.writeFile(destination, `optimized-${generate.mock.calls.length}`);
    });
    const { cache, configuration, source } = await createCache(generate);

    await cache.synchronize([playlistRecord()]);
    const firstRevision = (await cache.listPlaylistCoverIndex()).revisions.get(playlistId)!;
    await cache.synchronize([playlistRecord()]);
    expect(generate).toHaveBeenCalledTimes(1);

    await fs.writeFile(source, "changed-original-cover");
    await cache.synchronize([playlistRecord()]);
    const secondRevision = (await cache.listPlaylistCoverIndex()).revisions.get(playlistId)!;

    expect(generate).toHaveBeenCalledTimes(2);
    expect(secondRevision).not.toBe(firstRevision);
    await expect(
      fs.access(
        playlistCoverPath(configuration.media.playlistCoversDirectory, playlistId, firstRevision),
      ),
    ).resolves.toBeUndefined();

    await fs.writeFile(source, "changed-original-cover-again");
    await cache.synchronize([playlistRecord()]);
    const thirdRevision = (await cache.listPlaylistCoverIndex()).revisions.get(playlistId)!;

    expect(generate).toHaveBeenCalledTimes(3);
    await expect(
      fs.access(
        playlistCoverPath(configuration.media.playlistCoversDirectory, playlistId, firstRevision),
      ),
    ).rejects.toMatchObject({ code: "ENOENT" });
    await expect(
      fs.access(
        playlistCoverPath(configuration.media.playlistCoversDirectory, playlistId, secondRevision),
      ),
    ).resolves.toBeUndefined();
    await expect(
      fs.access(
        playlistCoverPath(configuration.media.playlistCoversDirectory, playlistId, thirdRevision),
      ),
    ).resolves.toBeUndefined();
  });

  it("keeps the current revision when replacement generation fails", async () => {
    let fail = false;
    const generate = vi.fn<PlaylistCoverGenerator>(async (_source, destination) => {
      if (fail) throw new Error("FFmpeg failed");
      await fs.mkdir(path.dirname(destination), { recursive: true });
      await fs.writeFile(destination, "current-cover");
    });
    const { cache, configuration, source, warn } = await createCache(generate);

    await cache.synchronize([playlistRecord()]);
    const revision = (await cache.listPlaylistCoverIndex()).revisions.get(playlistId)!;
    fail = true;
    await fs.writeFile(source, "changed-original-cover");
    await cache.synchronize([playlistRecord()]);

    expect((await cache.listPlaylistCoverIndex()).revisions.get(playlistId)).toBe(revision);
    await expect(
      fs.readFile(
        playlistCoverPath(configuration.media.playlistCoversDirectory, playlistId, revision),
        "utf8",
      ),
    ).resolves.toBe("current-cover");
    expect(warn).toHaveBeenCalledWith(
      "Could not generate playlist cover",
      expect.objectContaining({ playlistId, path: "Playlist/cover.jpg" }),
    );
  });

  it("regenerates missing output and removes covers no longer in the library", async () => {
    const generate = vi.fn<PlaylistCoverGenerator>(async (_source, destination) => {
      await fs.mkdir(path.dirname(destination), { recursive: true });
      await fs.writeFile(destination, "optimized-cover");
    });
    const { cache, configuration } = await createCache(generate);

    await cache.synchronize([playlistRecord()]);
    const revision = (await cache.listPlaylistCoverIndex()).revisions.get(playlistId)!;
    await fs.rm(
      playlistCoverPath(configuration.media.playlistCoversDirectory, playlistId, revision),
    );
    await cache.synchronize([playlistRecord()]);
    expect(generate).toHaveBeenCalledTimes(2);

    await cache.synchronize([playlistRecord(null)]);
    expect((await cache.listPlaylistCoverIndex()).revisions.has(playlistId)).toBe(false);
    await expect(
      fs.access(path.join(configuration.media.playlistCoversDirectory, playlistId)),
    ).rejects.toMatchObject({ code: "ENOENT" });
  });
});
