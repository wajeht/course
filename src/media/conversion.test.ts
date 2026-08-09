import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { createConfiguration } from "../configuration.js";
import { createDatabase, type Database } from "../db/db.js";
import { createCatalogApiRepository } from "../routes/api/catalog/catalog.repository.js";
import { createLogger } from "../utils/logger.js";
import { createConversionManager, type ConversionExecutor } from "./conversion.js";
import { createConversionRepository } from "./conversion.repository.js";

const databases: Database[] = [];
const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(databases.splice(0).map((database) => database.close()));
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) => fs.rm(directory, { recursive: true })),
  );
});

async function fixture(executor: ConversionExecutor) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "course-conversion-"));
  temporaryDirectories.push(directory);
  const configuration = createConfiguration({
    APP_ENV: "testing",
    DATA_DIR: directory,
    VIDEOS_DIR: directory,
  });
  const database = await createDatabase(configuration, createLogger());
  databases.push(database);
  const now = new Date().toISOString();
  await database.connection("courses").insert({
    id: "a".repeat(24),
    path: "course",
    title: "Course",
    description: "",
    sort_order: 0,
    created_at: now,
    updated_at: now,
  });
  for (const [index, id] of ["b".repeat(24), "c".repeat(24)].entries()) {
    await database.connection("lessons").insert({
      id,
      course_id: "a".repeat(24),
      path: `course/${index}.mkv`,
      title: `Lesson ${index}`,
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
    const row = await database.connection("conversion_jobs").where({ lesson_id: lessonId }).first();
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
    const { database, catalog, manager } = await fixture(async (lesson) => {
      calls++;
      active++;
      maximumActive = Math.max(maximumActive, active);
      await new Promise((resolve) => setTimeout(resolve, 10));
      active--;
      return `/tmp/${lesson.id}/index.m3u8`;
    });
    const first = (await catalog.findLesson("b".repeat(24)))!;
    const second = (await catalog.findLesson("c".repeat(24)))!;

    await Promise.all([manager.request(first), manager.request(first), manager.request(second)]);
    await waitForStatus(database, first.id, "ready");
    await waitForStatus(database, second.id, "ready");

    expect(calls).toBe(2);
    expect(maximumActive).toBe(1);
  });

  it("records failures for an explicit retry", async () => {
    const { database, catalog, manager } = await fixture(async () => {
      throw new Error("Quick Sync unavailable");
    });
    const lesson = (await catalog.findLesson("b".repeat(24)))!;
    await manager.request(lesson);
    await waitForStatus(database, lesson.id, "failed");
    expect(await manager.get(lesson.id)).toMatchObject({
      status: "failed",
      error: "Quick Sync unavailable",
    });
  });
});
