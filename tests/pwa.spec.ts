import fs from "node:fs/promises";
import path from "node:path";

import { expect, test } from "@playwright/test";

const serviceWorkerPath = path.resolve("public/sw.js");

test("registers, serves deep links offline, and prompts for updates", async ({ context, page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1, name: "All courses" })).toBeVisible();
  await expect(page.getByText("Course is ready offline")).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(async () => (await navigator.serviceWorker.ready).active?.state ?? null),
    )
    .toBe("activated");

  await page.reload();
  await expect
    .poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
    .toBe(true);

  await context.setOffline(true);
  try {
    const response = await page.goto("/settings");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1, name: "Settings" })).toBeVisible();
  } finally {
    await context.setOffline(false);
  }

  const originalServiceWorker = await fs.readFile(serviceWorkerPath, "utf8");
  try {
    await fs.writeFile(serviceWorkerPath, `${originalServiceWorker}\n// pwa-update-test\n`);
    await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      await registration?.update();
    });
    await expect(page.getByText("Course update available")).toBeVisible();
  } finally {
    await fs.writeFile(serviceWorkerPath, originalServiceWorker);
  }
});
