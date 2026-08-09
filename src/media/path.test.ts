import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { resolveContainedPath } from "./path.js";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) => fs.rm(directory, { recursive: true })),
  );
});

describe("resolveContainedPath", () => {
  it("resolves files inside the configured root", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "course-path-root-"));
    temporaryDirectories.push(root);
    const lesson = path.join(root, "course", "lesson.mp4");
    await fs.mkdir(path.dirname(lesson));
    await fs.writeFile(lesson, "video");

    await expect(resolveContainedPath(root, "course/lesson.mp4")).resolves.toBe(
      await fs.realpath(lesson),
    );
  });

  it("rejects path traversal", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "course-path-root-"));
    temporaryDirectories.push(root);

    await expect(resolveContainedPath(root, "../secret.mp4")).rejects.toThrow(
      "Path leaves the configured media directory",
    );
  });

  it("rejects symlinks that resolve outside the configured root", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "course-path-root-"));
    const outside = await fs.mkdtemp(path.join(os.tmpdir(), "course-path-outside-"));
    temporaryDirectories.push(root, outside);
    await fs.writeFile(path.join(outside, "secret.mp4"), "secret");
    await fs.symlink(outside, path.join(root, "linked"));

    await expect(resolveContainedPath(root, "linked/secret.mp4")).rejects.toThrow(
      "Path leaves the configured media directory",
    );
  });
});
