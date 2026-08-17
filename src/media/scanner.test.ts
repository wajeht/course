import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { createConfiguration } from "../configuration.js";
import { createDatabase, type Database } from "../db/db.js";
import { createLogger } from "../logger.js";
import { createCatalogRepository } from "./catalog.repository.js";
import { createScanner } from "./scanner.js";
import type { VideoProbe } from "./probe.js";

const temporaryDirectories: string[] = [];
const databases: Database[] = [];
const monitorStops: Array<() => void> = [];

afterEach(async () => {
  for (const stop of monitorStops.splice(0)) stop();
  await Promise.all(databases.splice(0).map((database) => database.close()));
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) => fs.rm(directory, { recursive: true })),
  );
});

describe("media scanner", () => {
  it("ignores system metadata and empty directories", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "course-scanner-"));
    const dataDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "course-scanner-data-"));
    temporaryDirectories.push(root, dataDirectory);
    await fs.mkdir(path.join(root, "@eaDir", "metadata"), { recursive: true });
    await fs.writeFile(path.join(root, "@eaDir", "metadata", "thumbnail.mp4"), "video");
    await fs.mkdir(path.join(root, "#recycle", "Deleted Course"), { recursive: true });
    await fs.writeFile(path.join(root, "#recycle", "Deleted Course", "lesson.mp4"), "video");
    await fs.mkdir(path.join(root, "Empty Course"));

    const courseDirectory = path.join(root, "Real Course");
    const sectionDirectory = path.join(courseDirectory, "Volume 1");
    await fs.mkdir(path.join(courseDirectory, "@eaDir"), { recursive: true });
    await fs.mkdir(path.join(courseDirectory, "#recycle"), { recursive: true });
    await fs.mkdir(path.join(courseDirectory, "Empty Section"), { recursive: true });
    await fs.mkdir(sectionDirectory, { recursive: true });
    await fs.writeFile(path.join(courseDirectory, "@eaDir", "thumbnail.mp4"), "video");
    await fs.writeFile(path.join(courseDirectory, "#recycle", "deleted.mp4"), "video");
    await fs.writeFile(path.join(sectionDirectory, "01 - Lesson.mp4"), "video");

    const configuration = createConfiguration({
      APP_ENV: "testing",
      VIDEOS_DIR: root,
      DATA_DIR: dataDirectory,
    });
    const database = await createDatabase(configuration, createLogger());
    databases.push(database);
    const scanner = createScanner({
      configuration,
      repository: createCatalogRepository(database.connection),
      logger: createLogger(),
      probe: async (): Promise<VideoProbe> => ({
        durationSeconds: 60,
        sizeBytes: 100,
        container: "mp4",
        videoCodec: "h264",
        audioCodec: "aac",
        browserCompatible: true,
      }),
    });

    const status = await scanner.scanCatalog();
    const courses = await database.connection("courses").select("title");
    const sections = await database.connection("sections").select("title");
    const lessons = await database.connection("lessons").select("title");

    expect(status).toMatchObject({ status: "complete", courseCount: 1, lessonCount: 1 });
    expect(courses).toEqual([{ title: "Real Course" }]);
    expect(sections).toEqual([{ title: "Volume 1" }]);
    expect(lessons).toEqual([{ title: "Lesson" }]);
  });

  it("indexes course metadata, sections, natural order, and warnings", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "course-scanner-"));
    const dataDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "course-scanner-data-"));
    temporaryDirectories.push(root, dataDirectory);
    const courseDirectory = path.join(root, "Course 1");
    const sectionDirectory = path.join(courseDirectory, "02 - Escapes");
    await fs.mkdir(sectionDirectory, { recursive: true });
    await fs.writeFile(
      path.join(courseDirectory, "course.json"),
      JSON.stringify({
        version: 1,
        title: "Essential Guard",
        description: "Build reliable layers",
        cover: "cover.jpg",
        category: "Martial Arts",
        instructors: ["Jane Smith"],
        tags: ["Guard", "Defense"],
        lessons: [
          {
            path: "02 - Start.mp4",
            chapters: [
              { title: "Introduction", startSeconds: 0 },
              { title: "Frames", startSeconds: 30 },
            ],
          },
          {
            path: "02 - Escapes/01 - Bridge.mkv",
            chapters: [{ title: "Bridge mechanics", startSeconds: 5 }],
          },
        ],
      }),
    );
    await fs.writeFile(path.join(courseDirectory, "cover.jpg"), "cover");
    await fs.writeFile(path.join(courseDirectory, "10 - Finish.mp4"), "video");
    await fs.writeFile(path.join(courseDirectory, "02 - Start.mp4"), "video");
    await fs.writeFile(path.join(courseDirectory, "03 - Broken.mp4"), "video");
    await fs.writeFile(path.join(sectionDirectory, "01 - Bridge.mkv"), "video");

    const configuration = createConfiguration({
      APP_ENV: "testing",
      VIDEOS_DIR: root,
      DATA_DIR: dataDirectory,
    });
    const database = await createDatabase(configuration, createLogger());
    databases.push(database);
    let failExistingLesson = false;
    const probeCalls = new Map<string, number>();
    const fakeProbe = async (filename: string): Promise<VideoProbe> => {
      const name = path.basename(filename);
      probeCalls.set(name, (probeCalls.get(name) ?? 0) + 1);
      if (filename.includes("Broken") || (failExistingLesson && filename.includes("Start"))) {
        throw new Error("File is still copying");
      }
      return {
        durationSeconds: 60,
        sizeBytes: (await fs.stat(filename)).size,
        container: path.extname(filename).slice(1),
        videoCodec: "h264",
        audioCodec: "aac",
        browserCompatible: path.extname(filename) === ".mp4",
      };
    };
    const scanner = createScanner({
      configuration,
      repository: createCatalogRepository(database.connection),
      logger: createLogger(),
      probe: fakeProbe,
    });

    const status = await scanner.scanCatalog();
    const courses = await database
      .connection("courses")
      .select("title", "description", "category", "instructors_json", "tags_json", "cover_path");
    const sections = await database.connection("sections").select("title");
    const lessons = await database
      .connection("lessons")
      .orderByRaw("section_id IS NOT NULL")
      .orderBy("sort_order")
      .select("title");
    const chapters = await database
      .connection("chapters")
      .join("lessons", "lessons.id", "chapters.lesson_id")
      .orderBy("lessons.title")
      .orderBy("chapters.sort_order")
      .select("lessons.title as lesson", "chapters.title", "chapters.start_seconds");

    expect(status).toMatchObject({ status: "complete", courseCount: 1, lessonCount: 3 });
    expect(status.warnings).toEqual([
      expect.objectContaining({
        path: "Course 1/03 - Broken.mp4",
        message: "File is still copying",
      }),
    ]);
    expect(courses).toEqual([
      {
        title: "Essential Guard",
        description: "Build reliable layers",
        category: "Martial Arts",
        instructors_json: '["Jane Smith"]',
        tags_json: '["Guard","Defense"]',
        cover_path: "Course 1/cover.jpg",
      },
    ]);
    expect(sections).toEqual([{ title: "Escapes" }]);
    expect(lessons).toEqual([{ title: "Start" }, { title: "Finish" }, { title: "Bridge" }]);
    expect(chapters).toEqual([
      { lesson: "Bridge", title: "Bridge mechanics", start_seconds: 5 },
      { lesson: "Start", title: "Introduction", start_seconds: 0 },
      { lesson: "Start", title: "Frames", start_seconds: 30 },
    ]);

    const existingLesson = await database.connection("lessons").where({ title: "Start" }).first();
    const convertedLesson = await database.connection("lessons").where({ title: "Finish" }).first();
    await database.connection("progress").insert({
      lesson_id: existingLesson.id,
      position_seconds: 30,
      completed: false,
      updated_at: new Date().toISOString(),
    });
    await database.connection("conversions").insert({
      lesson_id: convertedLesson.id,
      status: "ready",
      progress: 100,
    });
    const changedAt = new Date(Date.now() + 10_000);
    await fs.utimes(path.join(courseDirectory, "10 - Finish.mp4"), changedAt, changedAt);
    failExistingLesson = true;

    await scanner.scanCatalog();

    expect(
      await database.connection("lessons").where({ id: existingLesson.id }).first(),
    ).toBeTruthy();
    expect(
      await database.connection("progress").where({ lesson_id: existingLesson.id }).first(),
    ).toMatchObject({
      position_seconds: 30,
    });
    expect(
      await database.connection("conversions").where({ lesson_id: convertedLesson.id }).first(),
    ).toBeUndefined();
    expect(Object.fromEntries(probeCalls)).toEqual({
      "02 - Start.mp4": 1,
      "03 - Broken.mp4": 2,
      "10 - Finish.mp4": 2,
      "01 - Bridge.mkv": 1,
    });
  });

  it("reconciles added, removed, and renamed courses without re-inspecting other videos", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "course-scanner-"));
    const dataDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "course-scanner-data-"));
    temporaryDirectories.push(root, dataDirectory);
    const existingCourse = path.join(root, "Existing Course");
    await fs.mkdir(existingCourse);
    await fs.writeFile(path.join(existingCourse, "01 - Existing.mp4"), "existing video");

    const configuration = createConfiguration({
      APP_ENV: "testing",
      VIDEOS_DIR: root,
      DATA_DIR: dataDirectory,
    });
    const database = await createDatabase(configuration, createLogger());
    databases.push(database);
    const probeCalls: string[] = [];
    let emitWatchEvent = (_filename: string): void => {
      throw new Error("Library monitoring has not started");
    };
    const scanner = createScanner({
      configuration,
      repository: createCatalogRepository(database.connection),
      logger: createLogger(),
      watchDirectory: (_directory, _options, listener) => {
        emitWatchEvent = (filename) => listener("rename", filename);
        return {
          on() {
            return this;
          },
          close() {},
        };
      },
      probe: async (filename): Promise<VideoProbe> => {
        probeCalls.push(path.basename(filename));
        return {
          durationSeconds: 60,
          sizeBytes: (await fs.stat(filename)).size,
          container: "mp4",
          videoCodec: "h264",
          audioCodec: "aac",
          browserCompatible: true,
        };
      },
    });

    await scanner.scanCatalog();
    const stopMonitoring = scanner.startMonitoring();
    monitorStops.push(stopMonitoring);

    const addedCourse = path.join(root, "Added Course");
    await fs.mkdir(addedCourse);
    await fs.writeFile(path.join(addedCourse, "01 - Added.mp4"), "added video");
    emitWatchEvent("Added Course/01 - Added.mp4");
    await waitUntil(
      async () =>
        Number((await database.connection("courses").count({ count: "id" }).first())?.count) === 2,
    );

    expect(probeCalls).toEqual(["01 - Existing.mp4", "01 - Added.mp4"]);

    const renamedCourse = path.join(root, "Renamed Course");
    await fs.rename(existingCourse, renamedCourse);
    emitWatchEvent("Existing Course");
    await waitUntil(async () => {
      const courses = await database.connection("courses").select("title");
      return courses.length === 2 && courses.some((course) => course.title === "Renamed Course");
    });
    expect(probeCalls).toEqual(["01 - Existing.mp4", "01 - Added.mp4", "01 - Existing.mp4"]);

    await fs.rm(addedCourse, { recursive: true });
    emitWatchEvent("Added Course");
    await waitUntil(
      async () =>
        Number((await database.connection("courses").count({ count: "id" }).first())?.count) === 1,
    );
    expect(await database.connection("courses").select("title")).toEqual([
      { title: "Renamed Course" },
    ]);
    expect(probeCalls).toEqual(["01 - Existing.mp4", "01 - Added.mp4", "01 - Existing.mp4"]);
  });

  it("keeps warnings for courses that were not rescanned", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "course-scanner-"));
    const dataDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "course-scanner-data-"));
    temporaryDirectories.push(root, dataDirectory);
    const brokenCourse = path.join(root, "Broken Course");
    const healthyCourse = path.join(root, "Healthy Course");
    await Promise.all([fs.mkdir(brokenCourse), fs.mkdir(healthyCourse)]);
    const brokenVideo = path.join(brokenCourse, "01 - Broken.mp4");
    const healthyVideo = path.join(healthyCourse, "01 - Healthy.mp4");
    await Promise.all([
      fs.writeFile(brokenVideo, "broken video"),
      fs.writeFile(healthyVideo, "healthy video"),
    ]);

    const configuration = createConfiguration({
      APP_ENV: "testing",
      VIDEOS_DIR: root,
      DATA_DIR: dataDirectory,
    });
    const database = await createDatabase(configuration, createLogger());
    databases.push(database);
    let emitWatchEvent = (_filename: string): void => {
      throw new Error("Library monitoring has not started");
    };
    let broken = true;
    const probeCalls = new Map<string, number>();
    const scanner = createScanner({
      configuration,
      repository: createCatalogRepository(database.connection),
      logger: createLogger(),
      watchDirectory: (_directory, _options, listener) => {
        emitWatchEvent = (filename) => listener("change", filename);
        return {
          on() {
            return this;
          },
          close() {},
        };
      },
      probe: async (filename): Promise<VideoProbe> => {
        const name = path.basename(filename);
        probeCalls.set(name, (probeCalls.get(name) ?? 0) + 1);
        if (broken && filename === brokenVideo) throw new Error("Could not inspect broken video");
        return {
          durationSeconds: 60,
          sizeBytes: (await fs.stat(filename)).size,
          container: "mp4",
          videoCodec: "h264",
          audioCodec: "aac",
          browserCompatible: true,
        };
      },
    });

    expect((await scanner.scanCatalog()).warnings).toEqual([
      {
        path: "Broken Course/01 - Broken.mp4",
        message: "Could not inspect broken video",
      },
    ]);
    monitorStops.push(scanner.startMonitoring());

    const changedAt = new Date(Date.now() + 10_000);
    await fs.utimes(healthyVideo, changedAt, changedAt);
    emitWatchEvent("Healthy Course/01 - Healthy.mp4");
    await waitUntil(
      async () =>
        (probeCalls.get("01 - Healthy.mp4") ?? 0) === 2 &&
        scanner.getScanStatus().status === "complete",
    );
    expect(scanner.getScanStatus().warnings).toEqual([
      {
        path: "Broken Course/01 - Broken.mp4",
        message: "Could not inspect broken video",
      },
    ]);

    broken = false;
    await fs.utimes(brokenVideo, changedAt, changedAt);
    emitWatchEvent("Broken Course/01 - Broken.mp4");
    await waitUntil(
      async () =>
        (probeCalls.get("01 - Broken.mp4") ?? 0) === 2 &&
        scanner.getScanStatus().status === "complete",
    );
    expect(scanner.getScanStatus().warnings).toEqual([]);
  });

  it("clears a resolved cover warning after an incremental scan", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "course-scanner-"));
    const dataDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "course-scanner-data-"));
    temporaryDirectories.push(root, dataDirectory);
    const courseDirectory = path.join(root, "Example Course");
    await fs.mkdir(courseDirectory);
    await fs.writeFile(
      path.join(courseDirectory, "course.json"),
      JSON.stringify({ version: 1, cover: "missing.jpg" }),
    );
    await fs.writeFile(path.join(courseDirectory, "01 - Lesson.mp4"), "video");

    const configuration = createConfiguration({
      APP_ENV: "testing",
      VIDEOS_DIR: root,
      DATA_DIR: dataDirectory,
    });
    const database = await createDatabase(configuration, createLogger());
    databases.push(database);
    let emitWatchEvent = (_filename: string): void => {
      throw new Error("Library monitoring has not started");
    };
    const scanner = createScanner({
      configuration,
      repository: createCatalogRepository(database.connection),
      logger: createLogger(),
      watchDirectory: (_directory, _options, listener) => {
        emitWatchEvent = (filename) => listener("rename", filename);
        return {
          on() {
            return this;
          },
          close() {},
        };
      },
      probe: async (filename): Promise<VideoProbe> => ({
        durationSeconds: 60,
        sizeBytes: (await fs.stat(filename)).size,
        container: "mp4",
        videoCodec: "h264",
        audioCodec: "aac",
        browserCompatible: true,
      }),
    });

    expect((await scanner.scanCatalog()).warnings).toEqual([
      {
        path: "Example Course/missing.jpg",
        message: "Configured cover does not exist",
      },
    ]);
    monitorStops.push(scanner.startMonitoring());

    await fs.writeFile(path.join(courseDirectory, "missing.jpg"), "cover");
    emitWatchEvent("Example Course/missing.jpg");
    await waitUntil(async () => {
      const course = await database.connection("courses").where({ path: "Example Course" }).first();
      return course?.cover_path === "Example Course/missing.jpg";
    });

    expect(scanner.getScanStatus().warnings).toEqual([]);
  });

  it("fails when library monitoring cannot start", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "course-scanner-"));
    const dataDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "course-scanner-data-"));
    temporaryDirectories.push(root, dataDirectory);
    const configuration = createConfiguration({
      APP_ENV: "testing",
      VIDEOS_DIR: root,
      DATA_DIR: dataDirectory,
    });
    const database = await createDatabase(configuration, createLogger());
    databases.push(database);
    const scanner = createScanner({
      configuration,
      repository: createCatalogRepository(database.connection),
      logger: createLogger(),
      watchDirectory: () => {
        throw new Error("Library watcher unavailable");
      },
    });

    expect(() => scanner.startMonitoring()).toThrow("Library watcher unavailable");
  });

  it("falls back to scheduled scans when an active watcher fails", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "course-scanner-"));
    const dataDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "course-scanner-data-"));
    temporaryDirectories.push(root, dataDirectory);
    const configuration = createConfiguration({
      APP_ENV: "testing",
      VIDEOS_DIR: root,
      DATA_DIR: dataDirectory,
    });
    const database = await createDatabase(configuration, createLogger());
    databases.push(database);
    const close = vi.fn();
    let failWatcher: ((error: Error) => void) | undefined;
    const logger = { ...createLogger(), warn: vi.fn() };
    const scanner = createScanner({
      configuration,
      repository: createCatalogRepository(database.connection),
      logger,
      watchDirectory: () => ({
        on: (_event, listener) => {
          failWatcher = listener;
          return { on: vi.fn(), close };
        },
        close,
      }),
    });

    const stop = scanner.startMonitoring();
    failWatcher?.(new Error("Library watcher unavailable"));
    stop();

    expect(close).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(
      "Library watcher unavailable; scheduled scans will continue",
      expect.objectContaining({ error: expect.any(Error) }),
    );
  });
});

async function waitUntil(check: () => Promise<boolean>): Promise<void> {
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    if (await check()) return;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error("Timed out waiting for library synchronization");
}
