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
    const fakeProbe = async (filename: string): Promise<VideoProbe> => {
      if (filename.includes("Broken")) throw new Error("File is still copying");
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

    const status = await scanner.scan();
    const courses = await database
      .connection("courses")
      .select("title", "description", "cover_path");
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
        cover_path: "Course 1/cover.jpg",
      },
    ]);
    expect(sections).toEqual([{ title: "Escapes" }]);
    expect(lessons).toEqual([{ title: "Start" }, { title: "Finish" }, { title: "Bridge" }]);
  });
});
