import { expect, test, type Page } from "@playwright/test";

const videoId = "a".repeat(24);
const playlistId = "b".repeat(24);

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

test("uses responsive library filters and a mobile drawer", async ({ page }) => {
  await authenticate(page);
  await page.route("**/api/library**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        authors: [{ name: "Example Author", videoCount: 1 }],
        continueWatching: [],
        pagination: { page: 1, pageSize: 24, totalPages: 1, totalVideos: 1 },
        playlists: [
          {
            authors: ["Example Author"],
            completedCount: 0,
            coverUrl: null,
            description: "",
            durationSeconds: 120,
            id: playlistId,
            nextVideoId: videoId,
            progressPercent: 0,
            source: null,
            tags: ["Example Tag"],
            title: "Saved Collection",
            videoCount: 1,
          },
        ],
        tags: [{ name: "Example Tag", videoCount: 1 }],
        videos: [
          {
            authors: ["Example Author"],
            completed: false,
            coverUrl: null,
            description: "",
            durationSeconds: 120,
            id: videoId,
            playlistId,
            playlistSectionId: null,
            playlistSectionTitle: null,
            playlistTitle: "Saved Collection",
            positionSeconds: 0,
            progressPercent: 0,
            source: null,
            tags: ["Example Tag"],
            title: "Example video",
          },
        ],
      }),
    });
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/videos");

  const search = page.getByTestId("mobile-library-search");
  const actions = page.getByTestId("mobile-filter-actions");
  const authorButton = page.locator('[data-mobile-filter="author"]');
  await expect(search).toBeVisible();
  await expect(actions).toBeVisible();
  await expect(authorButton).toBeVisible();

  await authorButton.click();
  const drawer = page.getByRole("dialog", { name: "Authors" });
  const closeButton = drawer.getByRole("button", { name: "Close authors filters" });
  await expect(drawer).toBeVisible();
  await expect(closeButton).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(drawer).toHaveCount(0);
  await expect(authorButton).toBeFocused();

  await authorButton.click();
  await drawer.getByRole("checkbox", { name: "Example Author (1)" }).check();
  await expect(page).toHaveURL(/author=Example(?:\+|%20)Author/);
  await page.keyboard.press("Escape");
  await expect(drawer).toHaveCount(0);

  await page.setViewportSize({ width: 1280, height: 900 });
  await expect(search).toBeHidden();
  await expect(actions).toBeHidden();
  await expect(page.getByRole("group", { name: "Authors" })).toBeVisible();
});

test("loads more videos on mobile and keeps the page in the URL", async ({ page }) => {
  await authenticate(page);
  await page.route("**/api/library**", async (route) => {
    const requestedPage = Number(new URL(route.request().url()).searchParams.get("page") ?? "1");
    const id = String(requestedPage).repeat(24);
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        authors: [],
        continueWatching: [],
        pagination: { page: requestedPage, pageSize: 1, totalPages: 2, totalVideos: 2 },
        playlists: [],
        tags: [],
        videos: [
          {
            authors: [],
            completed: false,
            coverUrl: null,
            description: "",
            durationSeconds: 60,
            id,
            playlistId: null,
            playlistSectionId: null,
            playlistSectionTitle: null,
            playlistTitle: null,
            positionSeconds: 0,
            progressPercent: 0,
            source: null,
            tags: [],
            title: requestedPage === 2 ? "Second video" : "First video",
          },
        ],
      }),
    });
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/videos");
  await expect(page.getByText("First video", { exact: true })).toBeVisible();

  const loadMore = page.getByTestId("load-more-videos");
  await expect(loadMore).toHaveText("Load more");
  await loadMore.click();

  await expect(page.getByText("Second video", { exact: true })).toBeVisible();
  await expect(page.getByText("First video", { exact: true })).toBeVisible();
  await expect(loadMore).toHaveCount(0);
  await expect(page).toHaveURL(/page=2/);

  await page.reload();
  await expect(page.getByText("First video", { exact: true })).toBeVisible();
  await expect(page.getByText("Second video", { exact: true })).toBeVisible();

  await page.setViewportSize({ width: 1280, height: 900 });
  await expect(page).toHaveURL(/page=2/);
  await expect(page.getByText("First video", { exact: true })).toBeHidden();
  await expect(page.getByText("Second video", { exact: true })).toBeVisible();
  await expect(page.getByText("Page 2 of 2")).toBeVisible();
});

test("loads more author videos on mobile and restores them from the URL", async ({ page }) => {
  await authenticate(page);
  await page.route("**/api/library**", async (route) => {
    const requestedPage = Number(new URL(route.request().url()).searchParams.get("page") ?? "1");
    const id = String(requestedPage + 2).repeat(24);
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        authors: [{ name: "Gordon Ryan", videoCount: 2 }],
        continueWatching: [],
        pagination: { page: requestedPage, pageSize: 1, totalPages: 2, totalVideos: 2 },
        playlists: [],
        tags: [],
        videos: [
          {
            authors: ["Gordon Ryan"],
            completed: false,
            coverUrl: null,
            description: "",
            durationSeconds: 60,
            id,
            playlistId: null,
            playlistSectionId: null,
            playlistSectionTitle: null,
            playlistTitle: null,
            positionSeconds: 0,
            progressPercent: 0,
            source: null,
            tags: [],
            title: requestedPage === 2 ? "Second author video" : "First author video",
          },
        ],
      }),
    });
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/authors/Gordon%20Ryan");
  await expect(page.getByText("First author video", { exact: true })).toBeVisible();

  const loadMore = page.getByTestId("load-more-author-videos");
  await expect(loadMore).toHaveText("Load more");
  await loadMore.click();

  await expect(page.getByText("First author video", { exact: true })).toBeVisible();
  await expect(page.getByText("Second author video", { exact: true })).toBeVisible();
  await expect(loadMore).toHaveCount(0);
  await expect(page).toHaveURL(/page=2/);

  await page.reload();
  await expect(page.getByText("First author video", { exact: true })).toBeVisible();
  await expect(page.getByText("Second author video", { exact: true })).toBeVisible();

  await page.setViewportSize({ width: 1280, height: 900 });
  await expect(page.getByText("First author video", { exact: true })).toBeHidden();
  await expect(page.getByText("Second author video", { exact: true })).toBeVisible();
  await expect(page.getByText("Page 2 of 2")).toBeVisible();
});
