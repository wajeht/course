import { expect, test } from "@playwright/test";

test("keeps the install experience online-only", async ({ context, page }) => {
  const password = "playwright-password";
  const setup = await page.request.post("/api/auth/password", {
    data: {
      password,
      confirmPassword: password,
      setupToken: "videos-playwright-setup-token",
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
    await expect(page.getByRole("status").filter({ hasText: "Opening Videos…" })).toBeVisible();
  } finally {
    releaseAuthCheck();
    await navigation;
  }

  await expect(page.getByRole("heading", { level: 1, name: "Continue watching" })).toBeVisible();
  await expect(page).toHaveTitle("Videos");
  const manifestResponse = await page.request.get("/manifest.webmanifest");
  expect(manifestResponse.status()).toBe(200);
  const manifest = (await manifestResponse.json()) as {
    screenshots: Array<{ form_factor: string; src: string }>;
    shortcuts: Array<{ url: string }>;
  };
  expect(manifest.shortcuts.map((shortcut) => shortcut.url)).toEqual([
    "/videos",
    "/settings/library",
  ]);
  expect(manifest.screenshots.map((screenshot) => screenshot.form_factor)).toEqual([
    "narrow",
    "wide",
  ]);

  await page.goto("/videos");
  await expect(page.getByRole("heading", { level: 1, name: "All videos" })).toBeVisible();
  await expect(page).toHaveTitle("All videos · Videos");

  await page.reload();
  await expect.poll(() => page.evaluate(async () => (await caches.keys()).length)).toBe(0);
  await expect
    .poll(() =>
      page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length),
    )
    .toBe(0);

  await context.setOffline(true);
  try {
    await expect(page.getByText("You’re offline. Reconnect to keep using Videos.")).toBeVisible();
  } finally {
    await context.setOffline(false);
  }

  await page.goto("/settings/library");
  await expect(page.getByRole("heading", { level: 1, name: "Settings" })).toBeVisible();
  await expect(page).toHaveTitle("Library settings · Videos");

  const settingsNavigation = page.getByRole("navigation", { name: "Settings sections" });
  await settingsNavigation.getByRole("link", { name: "Access", exact: true }).click();
  await expect(page).toHaveURL(/\/settings\/access$/);
  await expect(page.getByRole("heading", { level: 2, name: "Access" })).toBeVisible();
  await expect(page).toHaveTitle("Access settings · Videos");
  await settingsNavigation.getByRole("link", { name: "Library", exact: true }).click();
  await expect(page).toHaveURL(/\/settings\/library$/);
  await expect(page).toHaveTitle("Library settings · Videos");

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
});
