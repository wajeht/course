import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createConfiguration } from "../configuration.js";
import { createDatabase, type Database } from "../db/db.js";
import { createLogger } from "../logger.js";
import { createProgressRepository } from "../progress/progress.repository.js";
import { createProgressService } from "../progress/progress.service.js";
import { createCatalogApiRepository } from "./catalog.repository.js";
import { createCatalogService } from "./catalog.service.js";

let database: Database;

beforeEach(async () => {
  database = await createDatabase(createConfiguration({ APP_ENV: "testing" }), createLogger());
  await database.connection("courses").insert([
    {
      id: "a".repeat(24),
      path: "technology",
      title: "Container Fundamentals",
      description: "Build reliable services",
      category: "Technology",
      instructors_json: JSON.stringify(["Jane Smith"]),
      tags_json: JSON.stringify(["Docker", "DevOps"]),
      sort_order: 0,
    },
    {
      id: "b".repeat(24),
      path: "martial-arts",
      title: "Guard Retention",
      description: "Stay connected",
      category: "Martial Arts",
      instructors_json: JSON.stringify(["John Doe", "jane smith"]),
      tags_json: JSON.stringify(["Guard"]),
      sort_order: 1,
    },
  ]);
});

afterEach(async () => database.close());

function createService(pageSize = 24) {
  return createCatalogService(createCatalogApiRepository(database.connection), {
    getCatalogPageSize: async () => pageSize,
  });
}

describe("catalog service", () => {
  it("filters courses by category and lists category counts", async () => {
    const service = createService();

    await expect(service.getCatalog({ category: "Technology" })).resolves.toMatchObject({
      courses: [
        {
          title: "Container Fundamentals",
          category: "Technology",
          instructors: ["Jane Smith"],
          tags: ["Docker", "DevOps"],
        },
      ],
      categories: [
        { name: "Martial Arts", courseCount: 1 },
        { name: "Technology", courseCount: 1 },
      ],
      instructors: [{ name: "Jane Smith", courseCount: 1 }],
      tags: [
        { name: "DevOps", courseCount: 1 },
        { name: "Docker", courseCount: 1 },
      ],
    });
  });

  it("limits the other dropdown choices to the selected category", async () => {
    const service = createService();

    await expect(service.getCatalog({ category: "Martial Arts" })).resolves.toMatchObject({
      instructors: [
        { name: "jane smith", courseCount: 1 },
        { name: "John Doe", courseCount: 1 },
      ],
      tags: [{ name: "Guard", courseCount: 1 }],
    });
  });

  it("searches category, instructors, and tags", async () => {
    const service = createService();

    for (const query of ["Technology", "Docker"]) {
      const result = await service.getCatalog({ query });
      expect(result.courses.map((course) => course.title)).toEqual(["Container Fundamentals"]);
    }

    const instructorResult = await service.getCatalog({ query: "Jane Smith" });
    expect(instructorResult.courses.map((course) => course.title)).toEqual([
      "Container Fundamentals",
      "Guard Retention",
    ]);
  });

  it("filters by an exact instructor and lists instructor counts", async () => {
    const service = createService();

    await expect(service.getCatalog({ instructor: "Jane Smith" })).resolves.toMatchObject({
      courses: [{ title: "Container Fundamentals" }, { title: "Guard Retention" }],
      instructors: [
        { name: "Jane Smith", courseCount: 2 },
        { name: "John Doe", courseCount: 1 },
      ],
    });

    await expect(service.getCatalog({ instructor: "Jane" })).resolves.toMatchObject({
      courses: [],
    });
  });

  it("filters by an exact tag and lists tag counts", async () => {
    const service = createService();

    await expect(service.getCatalog({ tag: "Guard" })).resolves.toMatchObject({
      courses: [{ title: "Guard Retention" }],
      tags: [
        { name: "DevOps", courseCount: 1 },
        { name: "Docker", courseCount: 1 },
        { name: "Guard", courseCount: 1 },
      ],
    });

    await expect(service.getCatalog({ tag: "Gua" })).resolves.toMatchObject({ courses: [] });
  });

  it("paginates filtered courses and reports the result total", async () => {
    const service = createService();

    await expect(service.getCatalog({ page: 2, pageSize: 1 })).resolves.toMatchObject({
      courses: [{ title: "Guard Retention" }],
      pagination: { page: 2, pageSize: 1, totalCourses: 2, totalPages: 2 },
    });
  });

  it("uses the configured page size when the request omits one", async () => {
    const service = createService(1);

    await expect(service.getCatalog()).resolves.toMatchObject({
      courses: [{ title: "Container Fundamentals" }],
      pagination: { page: 1, pageSize: 1, totalCourses: 2, totalPages: 2 },
    });
  });

  it("clamps a page that is past the final result", async () => {
    const service = createService();

    await expect(service.getCatalog({ page: 99, pageSize: 1 })).resolves.toMatchObject({
      courses: [{ title: "Guard Retention" }],
      pagination: { page: 2, pageSize: 1, totalCourses: 2, totalPages: 2 },
    });
  });

  it("lists only the most recently watched lesson from each course", async () => {
    const lessonIds = ["c".repeat(24), "d".repeat(24), "e".repeat(24)];
    await database.connection("lessons").insert([
      {
        id: lessonIds[0],
        course_id: "a".repeat(24),
        path: "technology/older.mp4",
        title: "Older lesson",
        sort_order: 0,
        duration_seconds: 100,
        size_bytes: 100,
        container: "mp4",
        video_codec: "h264",
        browser_compatible: true,
        modified_at: "2026-08-16T12:00:00.000Z",
      },
      {
        id: lessonIds[1],
        course_id: "a".repeat(24),
        path: "technology/latest.mp4",
        title: "Latest lesson",
        sort_order: 1,
        duration_seconds: 100,
        size_bytes: 100,
        container: "mp4",
        video_codec: "h264",
        browser_compatible: true,
        modified_at: "2026-08-16T12:00:00.000Z",
      },
      {
        id: lessonIds[2],
        course_id: "b".repeat(24),
        path: "martial-arts/current.mp4",
        title: "Other course lesson",
        sort_order: 0,
        duration_seconds: 100,
        size_bytes: 100,
        container: "mp4",
        video_codec: "h264",
        browser_compatible: true,
        modified_at: "2026-08-16T12:00:00.000Z",
      },
    ]);
    await database.connection("progress").insert([
      {
        lesson_id: lessonIds[0],
        position_seconds: 10,
        completed: false,
        updated_at: "2026-08-16T12:01:00.000Z",
      },
      {
        lesson_id: lessonIds[2],
        position_seconds: 30,
        completed: false,
        updated_at: "2026-08-16T12:02:00.000Z",
      },
      {
        lesson_id: lessonIds[1],
        position_seconds: 20,
        completed: false,
        updated_at: "2026-08-16T12:03:00.000Z",
      },
    ]);

    const catalog = await createService().getCatalog();

    expect(catalog.continueWatching.map((lesson) => lesson.id)).toEqual([
      lessonIds[1],
      lessonIds[2],
    ]);

    const repository = createCatalogApiRepository(database.connection);
    const progress = createProgressService(
      createProgressRepository(database.connection),
      repository,
    );
    await progress.openLesson(lessonIds[0]!);

    const reopenedCatalog = await createService().getCatalog();
    expect(reopenedCatalog.continueWatching.map((lesson) => lesson.id)).toEqual([
      lessonIds[0],
      lessonIds[2],
    ]);
  });

  it("returns ordered chapters only with the opened lesson", async () => {
    const lessonId = "c".repeat(24);
    await database.connection("lessons").insert({
      id: lessonId,
      course_id: "a".repeat(24),
      path: "technology/lesson.mp4",
      title: "Lesson",
      sort_order: 0,
      duration_seconds: 1_000,
      size_bytes: 100,
      container: "mp4",
      video_codec: "h264",
      browser_compatible: true,
      modified_at: "2026-08-17T12:00:00.000Z",
    });
    await database.connection("chapters").insert([
      {
        id: "d".repeat(24),
        lesson_id: lessonId,
        title: "Second technique",
        start_seconds: 416,
        sort_order: 1,
      },
      {
        id: "e".repeat(24),
        lesson_id: lessonId,
        title: "Introduction",
        start_seconds: 0,
        sort_order: 0,
      },
    ]);

    await expect(createService().getLesson(lessonId)).resolves.toMatchObject({
      lesson: {
        title: "Lesson",
        chapters: [
          { title: "Introduction", startSeconds: 0 },
          { title: "Second technique", startSeconds: 416 },
        ],
      },
    });
  });
});
