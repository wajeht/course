import knex, { type Knex } from "knex";
import { afterEach, describe, expect, it } from "vitest";

import { createConfiguration } from "../configuration.js";
import { createKnexConfig } from "./knexfile.js";

let database: Knex | null = null;

afterEach(async () => {
  await database?.destroy();
  database = null;
});

describe("schema migration", () => {
  it("moves existing data into the refined schema", async () => {
    database = knex(createKnexConfig(createConfiguration({ APP_ENV: "testing" })));
    for (let migration = 0; migration < 5; migration++) await database.migrate.up();

    const courseId = "a".repeat(24);
    const lessonId = "b".repeat(24);
    const now = new Date().toISOString();
    await database("courses").insert({
      id: courseId,
      path: "course",
      title: "Course",
      description: "",
      sort_order: 0,
      created_at: now,
      updated_at: now,
    });
    await database("lessons").insert({
      id: lessonId,
      course_id: courseId,
      path: "course/lesson.mkv",
      title: "Lesson",
      sort_order: 0,
      duration_seconds: 60,
      size_bytes: 100,
      container: "mkv",
      video_codec: "hevc",
      audio_codec: "aac",
      browser_compatible: false,
      modified_at: now,
    });
    await database("settings").insert({
      key: "app_password",
      value: "password-hash",
      updated_at: now,
    });
    await database("auth_login_attempts").insert({
      client_key: "client",
      failures: 2,
      reset_at: Date.now() + 60_000,
    });
    await database("conversion_jobs").insert({
      lesson_id: lessonId,
      status: "ready",
      progress: 100,
      playlist_path: "/old/path/index.m3u8",
      error: null,
      created_at: now,
      updated_at: now,
    });

    await database.migrate.latest();

    await expect(database("auth_credentials").first()).resolves.toMatchObject({
      id: 1,
      password_hash: "password-hash",
    });
    await expect(database("login_attempts").first()).resolves.toMatchObject({
      client_key: "client",
      failures: 2,
    });
    await expect(database("conversions").first()).resolves.toEqual({
      lesson_id: lessonId,
      status: "ready",
      progress: 100,
      error: null,
    });
    await expect(database.schema.hasTable("settings")).resolves.toBe(false);
    await expect(database.schema.hasTable("auth_login_attempts")).resolves.toBe(false);
    await expect(database.schema.hasTable("conversion_jobs")).resolves.toBe(false);
    await expect(database.schema.hasTable("scan_state")).resolves.toBe(false);
    await expect(database("courses").columnInfo()).resolves.not.toHaveProperty("created_at");
    await expect(database("courses").columnInfo()).resolves.not.toHaveProperty("updated_at");
    const tables = (await database("sqlite_master").where({ type: "table" }).pluck("name"))
      .filter((name: string) => !name.startsWith("knex_") && name !== "sqlite_sequence")
      .sort();
    expect(tables).toEqual([
      "auth_credentials",
      "auth_sessions",
      "conversions",
      "courses",
      "lessons",
      "login_attempts",
      "progress",
      "sections",
    ]);

    await database.migrate.down();
    await expect(database.schema.hasTable("settings")).resolves.toBe(true);
    await expect(database.schema.hasTable("auth_login_attempts")).resolves.toBe(true);
    await expect(database.schema.hasTable("conversion_jobs")).resolves.toBe(true);
    await expect(database.schema.hasTable("scan_state")).resolves.toBe(true);
  });
});
