import { expect, test, type Page } from "@playwright/test";

const videoId = "c".repeat(24);
const playlistId = "d".repeat(24);

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

test("uses responsive video details and places the playlist below them on mobile", async ({
  page,
}) => {
  await authenticate(page);

  const videoTitle = "Basics of computer's memory and Getting started - C Programming Tutorial 02";
  const video = {
    authors: ["Example Author"],
    chapters: [
      { startSeconds: 0, title: "Introduction" },
      { startSeconds: 90, title: "Computer memory" },
      { startSeconds: 180, title: "Pointers" },
      { startSeconds: 270, title: "Summary" },
    ],
    completed: false,
    coverUrl: null,
    description:
      "A complete introduction to programming, computer memory, and the ideas used throughout this playlist.",
    durationSeconds: 120,
    id: videoId,
    playlistId,
    playlistSectionId: null,
    playlistSectionTitle: null,
    playlistTitle: "Saved Collection",
    positionSeconds: 0,
    progressPercent: 0,
    source: null,
    tags: [],
    title: videoTitle,
  };

  await page.route(`**/api/videos/${videoId}`, async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        video,
        playlist: {
          authors: ["Example Author"],
          completedCount: 0,
          coverUrl: null,
          description: "",
          durationSeconds: 120,
          id: playlistId,
          nextVideoId: videoId,
          progressPercent: 0,
          sections: [{ id: null, title: "Videos", videos: [video] }],
          source: null,
          tags: [],
          title: "Saved Collection",
          videoCount: 1,
        },
      }),
    });
  });
  await page.route(`**/api/playback/${videoId}`, async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ kind: "direct", url: "/media/example.mp4" }),
    });
  });
  await page.route(`**/api/progress/videos/${videoId}/open`, async (route) => {
    await route.fulfill({ contentType: "application/json", body: JSON.stringify({}) });
  });
  await page.route("**/media/example.mp4", async (route) => {
    await route.fulfill({ contentType: "video/mp4", body: "" });
  });

  await page.setViewportSize({ width: 1800, height: 900 });
  await page.goto(`/videos/${videoId}`);
  const title = page.getByRole("heading", { name: videoTitle });
  await expect(title).toBeVisible();
  expect((await title.boundingBox())?.width).toBeGreaterThan(1000);
  const playlistPanel = page.getByRole("complementary", { name: "Saved Collection" });
  await expect(playlistPanel).toBeVisible();
  await expect(page.getByRole("button", { name: "Summary" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Expand video details" })).toBeHidden();

  await page.setViewportSize({ width: 390, height: 844 });
  const actions = page.getByRole("button", { name: "Video actions" });
  const expand = page.getByRole("button", { name: "Expand video details" });

  await expect(actions).toBeVisible();
  await expect(expand).toBeVisible();
  await expect(page.getByRole("button", { name: "Summary" })).toBeHidden();
  await expect(playlistPanel).toBeVisible();
  expect(await playlistPanel.evaluate((element) => getComputedStyle(element).backgroundColor)).toBe(
    "rgb(248, 249, 246)",
  );
  expect(
    await page
      .getByRole("button", { name: "Introduction" })
      .evaluate((element) => getComputedStyle(element).backgroundColor),
  ).not.toBe("rgb(248, 249, 246)");
  await expect(page.getByRole("button", { name: "Open playlist Saved Collection" })).toHaveCount(0);

  const titleBox = await title.boundingBox();
  const actionsBox = await actions.boundingBox();
  expect(actionsBox?.x).toBeGreaterThan(titleBox?.x ?? 0);

  await expand.click();
  await expect(page.getByRole("button", { name: "Summary" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Collapse video details" })).toBeVisible();

  const detailsBox = await page.getByRole("region", { name: videoTitle }).boundingBox();
  const playlistBox = await playlistPanel.boundingBox();
  expect(playlistBox?.y).toBeGreaterThan((detailsBox?.y ?? 0) + (detailsBox?.height ?? 0));
});
