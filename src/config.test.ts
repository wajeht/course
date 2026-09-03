import path from "node:path";

import { describe, expect, it } from "vitest";

import { createConfiguration } from "./config.js";

describe("createConfiguration", () => {
  it("uses opinionated local defaults", () => {
    const configuration = createConfiguration({ APP_ENV: "development" });

    expect(configuration.media.dataDirectory).toBe(path.resolve("data"));
    expect(configuration.media.thumbnailsDirectory).toBe(
      path.join(path.resolve("data"), "thumbnails"),
    );
    expect(configuration.media.playlistCoversDirectory).toBe(
      path.join(path.resolve("data"), "playlist-covers"),
    );
    expect(configuration.media.videosDirectory).toBe("/Volumes/plex/videos");
    expect(configuration.app.port).toBe(80);
    expect(configuration.app.vuePort).toBe(3000);
    expect(configuration.app.clientDirectory).toBe(path.resolve("dist/client"));
  });

  it("uses the same defaults for a direct production start", () => {
    const configuration = createConfiguration({
      APP_ENV: "production",
      SESSION_SECRET: "production-session-secret-1234567890",
    });

    expect(configuration.media.dataDirectory).toBe(path.resolve("data"));
    expect(configuration.media.videosDirectory).toBe("/Volumes/plex/videos");
  });

  it("honors explicit container paths", () => {
    const configuration = createConfiguration({
      APP_ENV: "production",
      APP_PORT: "3000",
      APP_VUE_PORT: "5173",
      DATA_DIR: "/data",
      VIDEOS_DIR: "/videos",
      SESSION_SECRET: "production-session-secret-1234567890",
    });

    expect(configuration.media.dataDirectory).toBe("/data");
    expect(configuration.media.videosDirectory).toBe("/videos");
    expect(configuration.app.port).toBe(3000);
    expect(configuration.app.vuePort).toBe(5173);
  });

  it("requires an explicit session secret in production", () => {
    expect(() => createConfiguration({ APP_ENV: "production" })).toThrow(
      "SESSION_SECRET must be set in production",
    );
  });

  it.each(["/videos", "/videos/data"])(
    "rejects a data directory inside the video library: %s",
    (dataDirectory) => {
      expect(() =>
        createConfiguration({
          APP_ENV: "development",
          DATA_DIR: dataDirectory,
          VIDEOS_DIR: "/videos",
        }),
      ).toThrow("DATA_DIR must be outside VIDEOS_DIR");
    },
  );
});
