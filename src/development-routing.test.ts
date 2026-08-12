import { describe, expect, it } from "vitest";

import { apiProxyPattern, isViteApiModulePath } from "./development-routing.js";

describe("development routing", () => {
  const proxyPattern = new RegExp(apiProxyPattern);

  it.each(["/api/auth", "/api/auth/me", "/api/catalog", "/api/playback/lesson-1"])(
    "proxies backend route %s from Vite to Hono",
    (path) => {
      expect(proxyPattern.test(path)).toBe(true);
    },
  );

  it.each(["/api/auth.ts", "/api/catalog.ts", "/api/index.ts"])(
    "keeps frontend module %s in Vite",
    (path) => {
      expect(proxyPattern.test(path)).toBe(false);
      expect(isViteApiModulePath(path)).toBe(true);
    },
  );

  it.each(["/api/auth", "/api/auth/me", "/api/catalog"])(
    "keeps backend route %s in Hono",
    (path) => {
      expect(isViteApiModulePath(path)).toBe(false);
    },
  );
});
