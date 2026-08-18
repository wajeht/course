import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createConfiguration } from "../configuration.js";
import { createDatabase, type Database } from "../db/db.js";
import { createLogger } from "../logger.js";
import { createCatalogApiRepository } from "../catalog/catalog.repository.js";
import { createProgressRepository } from "./progress.repository.js";
import { createProgressService } from "./progress.service.js";

let database: Database;

beforeEach(async () => {
  database = await createDatabase(createConfiguration({ APP_ENV: "testing" }), createLogger());
  const now = new Date().toISOString();
  await database.connection("courses").insert({
    id: "a".repeat(24),
    path: "course",
    title: "Course",
    description: "",
    sort_order: 0,
  });
  await database.connection("lessons").insert({
    id: "b".repeat(24),
    course_id: "a".repeat(24),
    path: "course/lesson.mp4",
    title: "Lesson",
    sort_order: 0,
    duration_seconds: 100,
    size_bytes: 100,
    container: "mp4",
    video_codec: "h264",
    audio_codec: "aac",
    browser_compatible: true,
    modified_at: now,
  });
});

afterEach(async () => database.close());

describe("progress service", () => {
  it("marks an in-progress lesson as most recently opened", async () => {
    const service = createProgressService(
      createProgressRepository(database.connection),
      createCatalogApiRepository(database.connection),
    );
    await service.updateProgress("b".repeat(24), 25);
    await database
      .connection("progress")
      .where({ lesson_id: "b".repeat(24) })
      .update({ updated_at: "2020-01-01T00:00:00.000Z" });

    expect(await service.openLesson("b".repeat(24))).toBe(true);
    expect(await database.connection("progress").first()).toMatchObject({
      position_seconds: 25,
      completed: 0,
    });
    expect((await database.connection("progress").first()).updated_at).not.toBe(
      "2020-01-01T00:00:00.000Z",
    );
  });

  it("clamps positions and completes only through the completion action", async () => {
    const service = createProgressService(
      createProgressRepository(database.connection),
      createCatalogApiRepository(database.connection),
    );

    expect(await service.updateProgress("b".repeat(24), 150)).toBe(true);
    expect(await database.connection("progress").first()).toMatchObject({
      position_seconds: 100,
      completed: 0,
    });
    expect(await service.completeLesson("b".repeat(24))).toBe(true);
    expect(await database.connection("progress").first()).toMatchObject({
      position_seconds: 100,
      completed: 1,
    });
  });

  it("resets lesson and course progress", async () => {
    const service = createProgressService(
      createProgressRepository(database.connection),
      createCatalogApiRepository(database.connection),
    );
    await service.updateProgress("b".repeat(24), 25);
    await service.resetLesson("b".repeat(24));
    expect(await database.connection("progress")).toHaveLength(0);
    await service.updateProgress("b".repeat(24), 30);
    await service.resetCourse("a".repeat(24));
    expect(await database.connection("progress")).toHaveLength(0);
  });

  it("ignores zero positions instead of erasing saved progress", async () => {
    const service = createProgressService(
      createProgressRepository(database.connection),
      createCatalogApiRepository(database.connection),
    );

    await service.updateProgress("b".repeat(24), 25);
    await service.updateProgress("b".repeat(24), 0);
    expect(await database.connection("progress").first()).toMatchObject({
      position_seconds: 25,
      completed: 0,
    });

    await service.resetLesson("b".repeat(24));
    await service.updateProgress("b".repeat(24), 0);
    expect(await database.connection("progress")).toHaveLength(0);
  });
});
