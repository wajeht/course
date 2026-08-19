import fs from "node:fs/promises";
import path from "node:path";

import { describe, expect, it, vi } from "vitest";

import { createApp } from "./app.js";
import { createConfiguration } from "./config.js";
import { createTemporaryDirectory, createTestContext } from "./test/resources.js";

describe("application", () => {
  it("serves health, byte ranges, and production routes", async () => {
    const directory = await createTemporaryDirectory("course-app-");
    const videos = path.join(directory, "videos");
    const course = path.join(videos, "course");
    await fs.mkdir(course, { recursive: true });
    await fs.writeFile(path.join(course, "lesson.mp4"), "0123456789");
    await fs.writeFile(path.join(course, "cover.jpg"), "cover");
    const configuration = createConfiguration({
      APP_ENV: "testing",
      VIDEOS_DIR: videos,
      DATA_DIR: path.join(directory, "data"),
      AUTH_SETUP_TOKEN: "course-app-test-setup-token",
    });
    configuration.app.env = "production";
    const context = await createTestContext(configuration);
    const clientDirectory = path.join(directory, "client");
    await fs.mkdir(clientDirectory);
    await fs.writeFile(path.join(clientDirectory, "index.html"), "SPA");
    await fs.writeFile(path.join(clientDirectory, "robots.txt"), "User-agent: *\nDisallow: /\n");
    await fs.writeFile(path.join(clientDirectory, "favicon.ico"), "ico");
    await fs.writeFile(path.join(clientDirectory, "favicon.svg"), "<svg></svg>");
    await fs.writeFile(path.join(clientDirectory, "manifest.webmanifest"), "{}");
    context.configuration.app.clientDirectory = clientDirectory;
    const now = new Date().toISOString();
    await context.database.connection("courses").insert({
      id: "a".repeat(24),
      path: "course",
      title: "Course",
      description: "",
      cover_path: "course/cover.jpg",
      sort_order: 0,
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
    expect((await app.request("/api/catalog")).status).toBe(401);
    expect((await app.request(`/media/${"b".repeat(24)}`)).status).toBe(401);
    expect((await app.request(`/covers/${"a".repeat(24)}`)).status).toBe(401);
    expect((await app.request(`/hls/${"b".repeat(24)}/index.m3u8`)).status).toBe(401);

    const rejectedSetup = await app.request("/api/auth/password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        password: "course-test-password",
        confirmPassword: "course-test-password",
        setupToken: "wrong-setup-token",
      }),
    });
    expect(rejectedSetup.status).toBe(400);

    const setup = await app.request("/api/auth/password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        password: "course-test-password",
        confirmPassword: "course-test-password",
        setupToken: "course-app-test-setup-token",
      }),
    });
    expect(setup.status).toBe(201);
    const login = await app.request("/api/auth", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password: "course-test-password" }),
    });
    expect(login.status).toBe(200);
    const cookie = login.headers.get("set-cookie")?.split(";")[0];
    expect(cookie).toBeTruthy();

    const response = await app.request(`/media/${"b".repeat(24)}`, {
      headers: { range: "bytes=2-5", cookie: cookie! },
    });
    expect(response.status).toBe(206);
    expect(response.headers.get("content-range")).toBe("bytes 2-5/10");
    expect(await response.text()).toBe("2345");

    const cover = await app.request(`/covers/${"a".repeat(24)}`, {
      headers: { cookie: cookie! },
    });
    expect(cover.status).toBe(200);
    expect(cover.headers.get("cache-control")).toBe("private, max-age=31536000, immutable");
    expect(cover.headers.get("vary")).toBe("Cookie");
    expect(await cover.text()).toBe("cover");

    const openLesson = vi.spyOn(context.progress, "openLesson");
    const player = await app.request(`/api/playback/${"b".repeat(24)}`, {
      method: "POST",
      headers: { cookie: cookie!, origin: "http://localhost" },
    });
    expect(player.status).toBe(200);
    expect(await player.json()).toMatchObject({
      lesson: { id: "b".repeat(24), title: "Lesson" },
      course: { id: "a".repeat(24), title: "Course" },
      playback: { kind: "direct", url: `/media/${"b".repeat(24)}` },
    });
    expect(openLesson).not.toHaveBeenCalled();

    const apiNotFound = await app.request("/api/does-not-exist", {
      headers: { cookie: cookie! },
    });
    expect(apiNotFound.status).toBe(404);
    expect(await apiNotFound.json()).toEqual({ message: "Resource not found" });

    for (const catalogPath of [
      "/api/catalog/courses/not-an-id",
      "/api/catalog/lessons/not-an-id",
      `/api/catalog/courses/${"c".repeat(24)}`,
      `/api/catalog/lessons/${"d".repeat(24)}`,
    ]) {
      expect((await app.request(catalogPath, { headers: { cookie: cookie! } })).status).toBe(404);
    }

    const robots = await app.request("/robots.txt");
    expect(robots.status).toBe(200);
    expect(await robots.text()).toBe("User-agent: *\nDisallow: /\n");

    const faviconIco = await app.request("/favicon.ico");
    expect(faviconIco.status).toBe(200);
    expect(faviconIco.headers.get("content-type")).toContain("image/x-icon");

    const faviconSvg = await app.request("/favicon.svg");
    expect(faviconSvg.status).toBe(200);
    expect(faviconSvg.headers.get("content-type")).toContain("image/svg+xml");

    const manifest = await app.request("/manifest.webmanifest");
    expect(manifest.status).toBe(200);
    expect(manifest.headers.get("cache-control")).toBe("no-cache");

    for (const route of ["/", "/index.html"]) {
      const index = await app.request(route);
      expect(index.status).toBe(200);
      expect(index.headers.get("cache-control")).toBe("no-cache");
      expect(await index.text()).toBe("SPA");
    }

    const browserRoute = await app.request(`/courses/${"a".repeat(24)}`);
    expect(browserRoute.status).toBe(200);
    expect(browserRoute.headers.get("cache-control")).toBe("no-cache");
    expect(await browserRoute.text()).toBe("SPA");
  });
});
