import path from "node:path";

import { describe, expect, it } from "vitest";

import { resolveContainedPath } from "./path.js";

describe("resolveContainedPath", () => {
  it("resolves files inside the configured root", () => {
    expect(resolveContainedPath("/videos", "course/lesson.mp4")).toBe(
      path.resolve("/videos/course/lesson.mp4"),
    );
  });

  it("rejects path traversal", () => {
    expect(() => resolveContainedPath("/videos", "../secret.mp4")).toThrow(
      "Path leaves the configured media directory",
    );
  });
});
