import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { createConfiguration } from "../configuration.js";
import { createDatabase, type Database } from "../db/db.js";
import { createLogger } from "../utils/logger.js";
import { createCatalogRepository } from "./catalog.repository.js";
import { createScanner } from "./scanner.js";
import type { VideoProbe } from "./probe.js";

const temporaryDirectories: string[] = [];
const databases: Database[] = [];

afterEach(async () => {
  await Promise.all(databases.splice(0).map((database) => database.close()));
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) => fs.rm(directory, { recursive: true })),
  );
});

describe("media scanner", () => {
  it("ignores system metadata and empty directories", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "course-scanner-"));
    temporaryDirectories.push(root);
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
      DATA_DIR: path.join(root, "data"),
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
    temporaryDirectories.push(root);
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
      DATA_DIR: path.join(root, "data"),
    });
    const database = await createDatabase(configuration, createLogger());
    databases.push(database);
    let failExistingLesson = false;
    const fakeProbe = async (filename: string): Promise<VideoProbe> => {
      if (filename.includes("Broken") || (failExistingLesson && filename.includes("Start"))) {
        throw new Error("File is still copying");
      }
      return {
        durationSeconds: 60,
        sizeBytes: 100,
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

    const existingLesson = await database.connection("lessons").where({ title: "Start" }).first();
    const convertedLesson = await database.connection("lessons").where({ title: "Finish" }).first();
    await database.connection("progress").insert({
      lesson_id: existingLesson.id,
      position_seconds: 30,
      completed: false,
      updated_at: new Date().toISOString(),
    });
    await database.connection("conversion_jobs").insert({
      lesson_id: convertedLesson.id,
      status: "ready",
      progress: 100,
      playlist_path: "/data/hls/index.m3u8",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
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
      await database.connection("conversion_jobs").where({ lesson_id: convertedLesson.id }).first(),
    ).toBeUndefined();
  });
});
