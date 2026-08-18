import { afterEach, vi } from "vitest";

import { cleanupTestResources } from "./resources.js";

afterEach(async () => {
  await cleanupTestResources();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
