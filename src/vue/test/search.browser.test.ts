import { expect, test, type Page } from "@playwright/test";

const videoId = "c".repeat(24);

async function authenticate(page: Page): Promise<void> {
  const password = "playwright-password";
  const setup = await page.request.post("/api/auth/password", {
    data: {
      password,
      confirmPassword: password,
      setupToken: "videos-playwright-setup-token",
    },
  });
  expect([201, 409]).toContain(setup.status());
  expect((await page.request.post("/api/auth", { data: { password } })).status()).toBe(200);
}

test("searches videos globally with Command K", async ({ page }) => {
  await authenticate(page);
  await page.route("**/api/library**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        authors: [],
        continueWatching: [],
        pagination: { page: 1, pageSize: 20, totalPages: 1, totalVideos: 1 },
        playlists: [],
        tags: [],
        videos: [
          {
            authors: ["Example Author"],
            completed: false,
            coverUrl: null,
            description: "",
            durationSeconds: 120,
            id: videoId,
            playlistId: null,
            playlistSectionId: null,
            playlistSectionTitle: null,
            playlistTitle: null,
            positionSeconds: 0,
            progressPercent: 0,
            source: null,
            tags: [],
            title: "Memory optimization",
          },
        ],
      }),
    });
  });

  await page.goto("/");
  await page.keyboard.press("Meta+k");

  const palette = page.getByRole("dialog", { name: "Search videos" });
  const input = palette.getByRole("combobox", { name: "Search video titles" });
  await expect(palette).toBeVisible();
  await expect(input).toBeFocused();
  await input.fill("memory");
  await expect(palette.getByRole("option", { name: /Memory optimization/ })).toBeVisible();

  await input.press("Enter");
  await expect(page).toHaveURL(/\/videos\?q=memory$/);
  await expect(palette).toHaveCount(0);
});
