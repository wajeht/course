import fs from "node:fs/promises";
import path from "node:path";

import { expect, test } from "@playwright/test";

const serviceWorkerPath = path.resolve("dist/client/sw.js");

test("registers, serves deep links offline, and prompts for updates", async ({ context, page }) => {
  const password = "playwright-password";
  const setup = await page.request.post("/api/auth/password", {
    data: {
      password,
      confirmPassword: password,
      setupToken: "course-playwright-setup-token",
    },
  });
  expect([201, 409]).toContain(setup.status());
  const login = await page.request.post("/api/auth", { data: { password } });
  expect(login.status()).toBe(200);

  let releaseAuthCheck: () => void = () => undefined;
  let markAuthCheckStarted: () => void = () => undefined;
  const authCheckReleased = new Promise<void>((resolve) => {
    releaseAuthCheck = resolve;
  });
  const authCheckStarted = new Promise<void>((resolve) => {
    markAuthCheckStarted = resolve;
  });
  await page.route(
    "**/api/auth/me",
    async (route) => {
      markAuthCheckStarted();
      await authCheckReleased;
      await route.continue();
    },
    { times: 1 },
  );
  const navigation = page.goto("/");
  await authCheckStarted;
  try {
    await expect(page.getByText("Checking your session…")).toHaveCount(0);
    await expect(page.getByRole("status").filter({ hasText: "Opening Course…" })).toBeVisible();
  } finally {
    releaseAuthCheck();
    await navigation;
  }

  await expect(page.getByRole("heading", { level: 1, name: "Continue watching" })).toBeVisible();
  await expect(page).toHaveTitle("Course");
  await expect(page.getByText("The app can open offline")).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(async () => (await navigator.serviceWorker.ready).active?.state ?? null),
    )
    .toBe("activated");

  await page.goto("/library");
  await expect(page.getByRole("heading", { level: 1, name: "All courses" })).toBeVisible();
  await expect(page).toHaveTitle("Library · Course");

  await page.reload();
  await expect
    .poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
    .toBe(true);

  await context.setOffline(true);
  try {
    const response = await page.goto("/settings");
    expect(response?.status()).toBe(200);
    await expect(
      page.getByRole("heading", { level: 1, name: "Connection required" }),
    ).toBeVisible();
  } finally {
    await context.setOffline(false);
  }

  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Settings" })).toBeVisible();
  await expect(page).toHaveTitle("Settings · Course");

  await page.getByRole("button", { name: "Refresh library" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Library refreshed" })).toBeVisible();

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByRole("dialog", { name: "Sign out?" })).toBeVisible();
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Settings" })).toBeVisible();

  await page.getByRole("button", { name: "Sign out" }).click();
  await page
    .getByRole("dialog", { name: "Sign out?" })
    .getByRole("button", { name: "Sign out" })
    .click();
  await expect(page.getByRole("heading", { level: 1, name: "Welcome back" })).toBeVisible();
  await page.locator('input[autocomplete="current-password"]').fill("wrong-playwright-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Invalid password" })).toBeVisible();
  await expect(page.getByText("Your session expired. Sign in again.")).toHaveCount(0);
  await page.locator('input[autocomplete="current-password"]').fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Settings" })).toBeVisible();

  const originalServiceWorker = await fs.readFile(serviceWorkerPath, "utf8");
  try {
    await fs.writeFile(serviceWorkerPath, `${originalServiceWorker}\n// pwa-update-test\n`);
    await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      await registration?.update();
    });
    await expect(page.getByText("App update available")).toBeVisible();
  } finally {
    await fs.writeFile(serviceWorkerPath, originalServiceWorker);
  }
});
