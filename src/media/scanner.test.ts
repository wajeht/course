import fs from "node:fs/promises";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { createConfiguration } from "../config.js";
import { createLogger } from "../logger.js";
import { createTemporaryDirectory, createTestDatabase } from "../test/resources.js";
import { createCatalogRepository } from "./catalog.repository.js";
import { createScanner } from "./scanner.js";
import type { VideoProbe } from "./probe.js";

const monitorStops: Array<() => void> = [];

afterEach(() => {
  for (const stopMonitoring of monitorStops.splice(0)) stopMonitoring();
});

async function createScannerDirectories(): Promise<{
  root: string;
  dataDirectory: string;
}> {
  const [root, dataDirectory] = await Promise.all([
    createTemporaryDirectory("playlist-scanner-"),
    createTemporaryDirectory("playlist-scanner-data-"),
  ]);
  return { root, dataDirectory };
}

describe("media scanner", () => {
  it("ignores system metadata and empty directories", async () => {
    const { root, dataDirectory } = await createScannerDirectories();
    await fs.mkdir(path.join(root, "@eaDir", "metadata"), { recursive: true });
    await fs.writeFile(path.join(root, "@eaDir", "metadata", "thumbnail.mp4"), "video");
    await fs.mkdir(path.join(root, "#recycle", "Deleted Playlist"), { recursive: true });
    await fs.writeFile(path.join(root, "#recycle", "Deleted Playlist", "video.mp4"), "video");
    await fs.mkdir(path.join(root, "Empty Playlist"));

    const courseDirectory = path.join(root, "Real Playlist");
    const sectionDirectory = path.join(courseDirectory, "Volume 1");
    await fs.mkdir(path.join(courseDirectory, "@eaDir"), { recursive: true });
    await fs.mkdir(path.join(courseDirectory, "#recycle"), { recursive: true });
    await fs.mkdir(path.join(courseDirectory, "Empty Section"), { recursive: true });
    await fs.mkdir(sectionDirectory, { recursive: true });
    await fs.writeFile(path.join(courseDirectory, "@eaDir", "thumbnail.mp4"), "video");
    await fs.writeFile(path.join(courseDirectory, "#recycle", "deleted.mp4"), "video");
    await fs.writeFile(path.join(sectionDirectory, "01 - Video.mp4"), "video");

    const configuration = createConfiguration({
      APP_ENV: "testing",
      VIDEOS_DIR: root,
      DATA_DIR: dataDirectory,
    });
    const database = await createTestDatabase(configuration);
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
    const playlists = await database.connection("playlists").select("title");
    const sections = await database.connection("sections").select("title");
    const videos = await database.connection("videos").select("title");

    expect(status).toMatchObject({ status: "complete", courseCount: 1, lessonCount: 1 });
    expect(playlists).toEqual([{ title: "Real Playlist" }]);
    expect(sections).toEqual([{ title: "Volume 1" }]);
    expect(videos).toEqual([{ title: "Video" }]);
  });

  it("indexes playlist metadata, sections, natural order, and warnings", async () => {
    const { root, dataDirectory } = await createScannerDirectories();
    const courseDirectory = path.join(root, "Playlist 1");
    const sectionDirectory = path.join(courseDirectory, "02 - Escapes");
    await fs.mkdir(sectionDirectory, { recursive: true });
    await fs.writeFile(
      path.join(courseDirectory, "playlist.json"),
      JSON.stringify({
        version: 1,
        title: "Essential Guard",
        description: "Build reliable layers",
        cover: "cover.jpg",
        category: "Martial Arts",
        authors: ["Jane Smith"],
        tags: ["Guard", "Defense"],
      }),
    );
    await fs.writeFile(path.join(courseDirectory, "cover.jpg"), "cover");
    await fs.writeFile(path.join(courseDirectory, "10 - Finish.mp4"), "video");
    await fs.writeFile(path.join(courseDirectory, "02 - Start.mp4"), "video");
    await fs.writeFile(path.join(courseDirectory, "03 - Broken.mp4"), "video");
    await fs.writeFile(path.join(sectionDirectory, "01 - Bridge.mkv"), "video");
    await fs.writeFile(
      path.join(courseDirectory, "02 - Start.mp4.json"),
      JSON.stringify({
        version: 1,
        chapters: [
          { title: "Introduction", startSeconds: 0 },
          { title: "Frames", startSeconds: 30 },
        ],
      }),
    );
    await fs.writeFile(
      path.join(sectionDirectory, "01 - Bridge.mkv.json"),
      JSON.stringify({
        version: 1,
        chapters: [{ title: "Bridge mechanics", startSeconds: 5 }],
      }),
    );
    await fs.writeFile(
      path.join(courseDirectory, "10 - Finish.mp4.json"),
      JSON.stringify({
        version: 1,
        chapters: [{ title: "Outside video", startSeconds: 70 }],
      }),
    );

    const configuration = createConfiguration({
      APP_ENV: "testing",
      VIDEOS_DIR: root,
      DATA_DIR: dataDirectory,
    });
    const database = await createTestDatabase(configuration);
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
    const playlists = await database
      .connection("playlists")
      .select("title", "description", "category", "instructors_json", "tags_json", "cover_path");
    const sections = await database.connection("sections").select("title");
    const videos = await database
      .connection("videos")
      .orderByRaw("section_id IS NOT NULL")
      .orderBy("sort_order")
      .select("title");
    const chapters = await database
      .connection("chapters")
      .join("videos", "videos.id", "chapters.lesson_id")
      .orderBy("videos.title")
      .orderBy("chapters.sort_order")
      .select("videos.title as video", "chapters.title", "chapters.start_seconds");

    expect(status).toMatchObject({ status: "complete", courseCount: 1, lessonCount: 3 });
    expect(status.warnings).toEqual([
      {
        path: "Playlist 1/03 - Broken.mp4",
        message: "File is still copying",
      },
      {
        path: "Playlist 1/10 - Finish.mp4.json",
        message: "Chapter “Outside video” starts outside 10 - Finish.mp4",
      },
    ]);
    expect(playlists).toEqual([
      {
        title: "Essential Guard",
        description: "Build reliable layers",
        category: "Martial Arts",
        instructors_json: '["Jane Smith"]',
        tags_json: '["Guard","Defense"]',
        cover_path: "Playlist 1/cover.jpg",
      },
    ]);
    expect(sections).toEqual([{ title: "Escapes" }]);
    expect(videos).toEqual([{ title: "Start" }, { title: "Finish" }, { title: "Bridge" }]);
    expect(chapters).toEqual([
      { video: "Bridge", title: "Bridge mechanics", start_seconds: 5 },
      { video: "Start", title: "Introduction", start_seconds: 0 },
      { video: "Start", title: "Frames", start_seconds: 30 },
    ]);

    const existingLesson = await database.connection("videos").where({ title: "Start" }).first();
    const convertedLesson = await database.connection("videos").where({ title: "Finish" }).first();
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
      await database.connection("videos").where({ id: existingLesson.id }).first(),
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

  it("reconciles added, removed, and renamed playlists without re-inspecting other videos", async () => {
    const { root, dataDirectory } = await createScannerDirectories();
    const existingCourse = path.join(root, "Existing Playlist");
    await fs.mkdir(existingCourse);
    await fs.writeFile(path.join(existingCourse, "01 - Existing.mp4"), "existing video");

    const configuration = createConfiguration({
      APP_ENV: "testing",
      VIDEOS_DIR: root,
      DATA_DIR: dataDirectory,
    });
    const database = await createTestDatabase(configuration);
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

    const addedCourse = path.join(root, "Added Playlist");
    await fs.mkdir(addedCourse);
    await fs.writeFile(path.join(addedCourse, "01 - Added.mp4"), "added video");
    emitWatchEvent("Added Playlist/01 - Added.mp4");
    await waitUntil(
      async () =>
        Number((await database.connection("playlists").count({ count: "id" }).first())?.count) === 2,
    );

    expect(probeCalls).toEqual(["01 - Existing.mp4", "01 - Added.mp4"]);
    expect(await database.connection("playlists").orderBy("sort_order").select("title")).toEqual([
      { title: "Added Playlist" },
      { title: "Existing Playlist" },
    ]);

    const renamedCourse = path.join(root, "Renamed Playlist");
    await fs.rename(existingCourse, renamedCourse);
    emitWatchEvent("Existing Playlist");
    await waitUntil(async () => {
      const playlists = await database.connection("playlists").select("title");
      return playlists.length === 2 && playlists.some((playlist) => playlist.title === "Renamed Playlist");
    });
    expect(probeCalls).toEqual(["01 - Existing.mp4", "01 - Added.mp4", "01 - Existing.mp4"]);
    expect(await database.connection("playlists").orderBy("sort_order").select("title")).toEqual([
      { title: "Added Playlist" },
      { title: "Renamed Playlist" },
    ]);

    await fs.rm(addedCourse, { recursive: true });
    emitWatchEvent("Added Playlist");
    await waitUntil(
      async () =>
        Number((await database.connection("playlists").count({ count: "id" }).first())?.count) === 1,
    );
    expect(await database.connection("playlists").select("title")).toEqual([
      { title: "Renamed Playlist" },
    ]);
    expect(probeCalls).toEqual(["01 - Existing.mp4", "01 - Added.mp4", "01 - Existing.mp4"]);
  });

  it("rebuilds chapters when a sidecar changes without re-inspecting the video", async () => {
    const { root, dataDirectory } = await createScannerDirectories();
    const courseDirectory = path.join(root, "Example Playlist");
    await fs.mkdir(courseDirectory);
    const video = path.join(courseDirectory, "01 - Video.mp4");
    const sidecar = `${video}.json`;
    await fs.writeFile(video, "video");
    await fs.writeFile(
      sidecar,
      JSON.stringify({
        version: 1,
        chapters: [{ title: "Introduction", startSeconds: 0 }],
      }),
    );

    const configuration = createConfiguration({
      APP_ENV: "testing",
      VIDEOS_DIR: root,
      DATA_DIR: dataDirectory,
    });
    const database = await createTestDatabase(configuration);
    let emitWatchEvent = (_filename: string): void => {
      throw new Error("Library monitoring has not started");
    };
    let probeCount = 0;
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
        probeCount += 1;
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
    expect(await database.connection("chapters").pluck("title")).toEqual(["Introduction"]);
    monitorStops.push(scanner.startMonitoring());

    await fs.writeFile(
      sidecar,
      JSON.stringify({
        version: 1,
        chapters: [{ title: "Updated chapter", startSeconds: 5 }],
      }),
    );
    emitWatchEvent("Example Playlist/01 - Video.mp4.json");
    await waitUntil(async () => {
      const titles = await database.connection("chapters").pluck("title");
      return titles.length === 1 && titles[0] === "Updated chapter";
    });
    expect(probeCount).toBe(1);

    await fs.rm(sidecar);
    emitWatchEvent("Example Playlist/01 - Video.mp4.json");
    await waitUntil(
      async () =>
        Number((await database.connection("chapters").count({ count: "id" }).first())?.count) === 0,
    );
    expect(probeCount).toBe(1);
  });

  it("keeps warnings for playlists that were not rescanned", async () => {
    const { root, dataDirectory } = await createScannerDirectories();
    const brokenCourse = path.join(root, "Broken Playlist");
    const healthyCourse = path.join(root, "Healthy Playlist");
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
    const database = await createTestDatabase(configuration);
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
        path: "Broken Playlist/01 - Broken.mp4",
        message: "Could not inspect broken video",
      },
    ]);
    monitorStops.push(scanner.startMonitoring());

    const changedAt = new Date(Date.now() + 10_000);
    await fs.utimes(healthyVideo, changedAt, changedAt);
    emitWatchEvent("Healthy Playlist/01 - Healthy.mp4");
    await waitUntil(
      async () =>
        (probeCalls.get("01 - Healthy.mp4") ?? 0) === 2 &&
        scanner.scanStatus().status === "complete",
    );
    expect(scanner.scanStatus().warnings).toEqual([
      {
        path: "Broken Playlist/01 - Broken.mp4",
        message: "Could not inspect broken video",
      },
    ]);

    broken = false;
    await fs.utimes(brokenVideo, changedAt, changedAt);
    emitWatchEvent("Broken Playlist/01 - Broken.mp4");
    await waitUntil(
      async () =>
        (probeCalls.get("01 - Broken.mp4") ?? 0) === 2 &&
        scanner.scanStatus().status === "complete",
    );
    expect(scanner.scanStatus().warnings).toEqual([]);
  });

  it("clears a resolved cover warning after an incremental scan", async () => {
    const { root, dataDirectory } = await createScannerDirectories();
    const courseDirectory = path.join(root, "Example Playlist");
    await fs.mkdir(courseDirectory);
    await fs.writeFile(
      path.join(courseDirectory, "playlist.json"),
      JSON.stringify({ version: 1, cover: "missing.jpg" }),
    );
    await fs.writeFile(path.join(courseDirectory, "01 - Video.mp4"), "video");

    const configuration = createConfiguration({
      APP_ENV: "testing",
      VIDEOS_DIR: root,
      DATA_DIR: dataDirectory,
    });
    const database = await createTestDatabase(configuration);
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
        path: "Example Playlist/missing.jpg",
        message: "Configured cover does not exist",
      },
    ]);
    monitorStops.push(scanner.startMonitoring());

    await fs.writeFile(path.join(courseDirectory, "missing.jpg"), "cover");
    emitWatchEvent("Example Playlist/missing.jpg");
    await waitUntil(async () => {
      const playlist = await database.connection("playlists").where({ path: "Example Playlist" }).first();
      return playlist?.cover_path === "Example Playlist/missing.jpg";
    });

    expect(scanner.scanStatus().warnings).toEqual([]);
  });

  it("fails when library monitoring cannot start", async () => {
    const { root, dataDirectory } = await createScannerDirectories();
    const configuration = createConfiguration({
      APP_ENV: "testing",
      VIDEOS_DIR: root,
      DATA_DIR: dataDirectory,
    });
    const database = await createTestDatabase(configuration);
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
    const { root, dataDirectory } = await createScannerDirectories();
    const configuration = createConfiguration({
      APP_ENV: "testing",
      VIDEOS_DIR: root,
      DATA_DIR: dataDirectory,
    });
    const database = await createTestDatabase(configuration);
    let closeCount = 0;
    let failWatcher: ((error: Error) => void) | undefined;
    const logger = createLogger();
    const warn = vi.spyOn(logger, "warn");
    const scanner = createScanner({
      configuration,
      repository: createCatalogRepository(database.connection),
      logger,
      watchDirectory: () => ({
        on(_event, listener) {
          failWatcher = listener;
          return this;
        },
        close: () => {
          closeCount += 1;
        },
      }),
    });

    const stopMonitoring = scanner.startMonitoring();
    failWatcher?.(new Error("Library watcher unavailable"));
    stopMonitoring();

    expect(closeCount).toBe(1);
    expect(warn).toHaveBeenCalledWith(
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
