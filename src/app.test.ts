import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { createApp } from "./app.js";
import { createConfiguration } from "./configuration.js";
import { createContext, type AppContext } from "./context.js";

const contexts: AppContext[] = [];
const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(contexts.splice(0).map((context) => context.database.close()));
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) => fs.rm(directory, { recursive: true })),
  );
});

describe("application", () => {
  it("serves health and byte ranges", async () => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), "course-app-"));
    temporaryDirectories.push(directory);
    const videos = path.join(directory, "videos");
    const course = path.join(videos, "course");
    await fs.mkdir(course, { recursive: true });
    await fs.writeFile(path.join(course, "lesson.mp4"), "0123456789");
    const context = await createContext(
      createConfiguration({
        APP_ENV: "testing",
        VIDEOS_DIR: videos,
        DATA_DIR: path.join(directory, "data"),
      }),
    );
    contexts.push(context);
    const now = new Date().toISOString();
    await context.database.connection("courses").insert({
      id: "a".repeat(24),
      path: "course",
      title: "Course",
      description: "",
      sort_order: 0,
      created_at: now,
      updated_at: now,
    });
    await context.database.connection("lessons").insert({
      id: "b".repeat(24),
      course_id: "a".repeat(24),
      path: "course/lesson.mp4",
      title: "Lesson",
      sort_order: 0,
      duration_seconds: 10,
      size_bytes: 10,
      container: "mp4",
      video_codec: "h264",
      audio_codec: "aac",
      browser_compatible: true,
      modified_at: now,
    });
    const app = createApp(context);

    expect(await (await app.request("/healthz")).json()).toEqual({ status: "ok" });
    const response = await app.request(`/media/${"b".repeat(24)}`, {
      headers: { range: "bytes=2-5" },
    });
    expect(response.status).toBe(206);
    expect(response.headers.get("content-range")).toBe("bytes 2-5/10");
    expect(await response.text()).toBe("2345");
  });
});
