import { describe, expect, it } from "vitest";

import { apiProxyPattern } from "../vite.config.js";

describe("Vite API proxy", () => {
  const pattern = new RegExp(apiProxyPattern);

  it.each(["/api/auth", "/api/auth/me", "/api/catalog", "/api/playback/lesson-1"])(
    "proxies backend route %s",
    (path) => {
      expect(pattern.test(path)).toBe(true);
    },
  );

  it.each(["/api/auth.ts", "/api/catalog.ts", "/api/index.ts"])(
    "keeps frontend module %s in Vite",
    (path) => {
      expect(pattern.test(path)).toBe(false);
    },
  );
});
