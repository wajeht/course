import fs from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { createCatalogApiRepository } from "../catalog/catalog.repository.js";
import { createConfiguration } from "../config.js";
import type { Database } from "../db/db.js";
import { createLogger } from "../logger.js";
import { createTemporaryDirectory, createTestDatabase } from "../test/resources.js";
import { createConversionManager, type ConversionExecutor } from "./conversion.js";
import { createConversionRepository } from "./conversion.repository.js";

async function createFixture(executor: ConversionExecutor) {
  const directory = await createTemporaryDirectory("playlist-conversion-");
  const dataDirectory = path.join(directory, "data");
  const videosDirectory = path.join(directory, "videos");
  await Promise.all([
    fs.mkdir(dataDirectory, { recursive: true }),
    fs.mkdir(videosDirectory, { recursive: true }),
  ]);
  const configuration = createConfiguration({
    APP_ENV: "testing",
    DATA_DIR: dataDirectory,
    VIDEOS_DIR: videosDirectory,
  });
  const database = await createTestDatabase(configuration);
  const now = new Date().toISOString();
  await database.connection("playlists").insert({
    id: "a".repeat(24),
    path: "playlist",
    title: "Playlist",
    description: "",
    sort_order: 0,
  });
  for (const [index, id] of ["b".repeat(24), "c".repeat(24)].entries()) {
    await database.connection("videos").insert({
      id,
      course_id: "a".repeat(24),
      path: `playlist/${index}.mkv`,
      title: `Video ${index}`,
      sort_order: index,
      duration_seconds: 100,
      size_bytes: 100,
      container: "mkv",
      video_codec: "hevc",
      audio_codec: "aac",
      browser_compatible: false,
      modified_at: now,
    });
  }
  const catalog = createCatalogApiRepository(database.connection);
  const manager = createConversionManager({
    repository: createConversionRepository(database.connection),
    catalog,
    configuration,
    logger: createLogger(),
    executor,
  });
  return { database, catalog, manager };
}

async function waitForStatus(database: Database, lessonId: string, status: string): Promise<void> {
  for (let attempt = 0; attempt < 100; attempt++) {
    const row = await database.connection("conversions").where({ lesson_id: lessonId }).first();
    if (row?.status === status) return;
    await new Promise((resolve) => setTimeout(resolve, 2));
  }
  throw new Error(`Conversion did not reach ${status}`);
}

describe("conversion manager", () => {
  it("deduplicates jobs and runs only one conversion at a time", async () => {
    let active = 0;
    let maximumActive = 0;
    let calls = 0;
    const { database, catalog, manager } = await createFixture(async () => {
      calls++;
      active++;
      maximumActive = Math.max(maximumActive, active);
      await new Promise((resolve) => setTimeout(resolve, 10));
      active--;
    });
    const first = (await catalog.findLesson("b".repeat(24)))!;
    const second = (await catalog.findLesson("c".repeat(24)))!;

    await Promise.all([
      manager.requestConversion(first),
      manager.requestConversion(first),
      manager.requestConversion(second),
    ]);
    await waitForStatus(database, first.id, "ready");
    await waitForStatus(database, second.id, "ready");

    expect(calls).toBe(2);
    expect(maximumActive).toBe(1);
  });

  it("records failures for an explicit retry", async () => {
    const { database, catalog, manager } = await createFixture(async () => {
      throw new Error("Quick Sync unavailable");
    });
    const video = (await catalog.findLesson("b".repeat(24)))!;
    await manager.requestConversion(video);
    await waitForStatus(database, video.id, "failed");
    expect(await manager.getConversion(video.id)).toMatchObject({
      status: "failed",
      error: "Quick Sync unavailable",
    });
  });

  it("rebuilds a ready conversion when its playlist is missing", async () => {
    let calls = 0;
    const { database, catalog, manager } = await createFixture(async () => {
      calls++;
    });
    const video = (await catalog.findLesson("b".repeat(24)))!;

    await manager.requestConversion(video);
    await waitForStatus(database, video.id, "ready");
    await manager.requestConversion(video);
    await waitForStatus(database, video.id, "ready");

    expect(calls).toBe(2);
  });
});
