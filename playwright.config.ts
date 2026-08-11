import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { defineConfig, devices } from "@playwright/test";

const runtimeDirectory = path.join(os.tmpdir(), "course-pwa-tests");
const dataDirectory = path.join(runtimeDirectory, "data");
const videosDirectory = path.join(runtimeDirectory, "videos");

fs.mkdirSync(dataDirectory, { recursive: true });
fs.mkdirSync(videosDirectory, { recursive: true });

export default defineConfig({
  testDir: "tests",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm start",
    url: "http://127.0.0.1:4173/healthz",
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
    env: {
      APP_ENV: "production",
      APP_HOST: "127.0.0.1",
      APP_PORT: "4173",
      DATA_DIR: dataDirectory,
      VIDEOS_DIR: videosDirectory,
      SESSION_SECRET: "course-playwright-session-secret-123456789",
      AUTH_SETUP_TOKEN: "course-playwright-setup-token",
    },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
