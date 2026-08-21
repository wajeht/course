import { expect, test, type Page } from "@playwright/test";

async function authenticate(page: Page): Promise<void> {
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
}

test("filters through the API and uses the responsive mobile sheet", async ({ page }) => {
  await authenticate(page);

  await page.setViewportSize({ width: 390, height: 844 });
  const catalogResponsePromise = page.waitForResponse(
    (response) => new URL(response.url()).pathname === "/api/catalog",
  );
  await page.goto("/library?category=Technology&category=Martial%20Arts&category=Technology");
  const catalogResponse = await catalogResponsePromise;
  expect(catalogResponse.status()).toBe(200);
  expect(new URL(catalogResponse.url()).searchParams.getAll("category")).toEqual([
    "Martial Arts",
    "Technology",
  ]);

  const categoryButton = page.locator('[data-mobile-filter="category"]');
  const filterColumn = page.getByTestId("catalog-filter-column");
  const courseColumn = page.getByTestId("catalog-course-column");
  await expect(categoryButton).toBeVisible();
  expect((await categoryButton.boundingBox())!.height).toBeGreaterThanOrEqual(40);
  await expect(filterColumn).toHaveCSS("position", "sticky");
  await expect(filterColumn).toHaveCSS("top", "66px");
  await expect(filterColumn).toHaveCSS("background-color", "rgb(245, 246, 242)");
  await expect(filterColumn).toHaveCSS("border-top-width", "0px");
  await expect(filterColumn).toHaveCSS("box-shadow", "none");
  await expect(page.locator('[data-testid="catalog-search"]:visible')).toHaveCSS(
    "box-shadow",
    "none",
  );
  const mobileFilterBox = (await filterColumn.boundingBox())!;
  const mobileClientWidth = await page.evaluate(() => document.documentElement.clientWidth);
  expect(mobileFilterBox.x).toBe(0);
  expect(mobileFilterBox.width).toBe(mobileClientWidth);
  const mobileSearchBox = (await page
    .locator('[data-testid="catalog-search"]:visible')
    .boundingBox())!;
  const mobileActionsBox = (await page.getByTestId("mobile-filter-actions").boundingBox())!;
  const mobileCourseBox = (await courseColumn.boundingBox())!;
  expect(Math.round(mobileSearchBox.y - mobileFilterBox.y)).toBe(18);
  expect(Math.round(mobileCourseBox.y - (mobileActionsBox.y + mobileActionsBox.height))).toBe(18);
  await filterColumn.evaluate((element) => {
    element.closest<HTMLElement>('[data-testid="catalog-layout"]')!.style.minHeight = "1800px";
  });
  await page.evaluate(() => window.scrollTo(0, 500));
  await expect.poll(async () => Math.round((await filterColumn.boundingBox())!.y)).toBe(66);
  await page.evaluate(() => window.scrollTo(0, 0));
  await categoryButton.click();

  const drawer = page.getByRole("dialog", { name: "Categories" });
  const surface = page.getByTestId("app-drawer-surface");
  const closeButton = drawer.getByRole("button", { name: "Close categories filters" });
  await expect(drawer).toBeVisible();
  await expect(closeButton).toBeFocused();
  expect(
    await drawer.evaluate((element) => getComputedStyle(element, "::backdrop").backdropFilter),
  ).toBe("none");

  const surfaceBox = await surface.boundingBox();
  expect(surfaceBox).not.toBeNull();
  expect(surfaceBox!.x).toBe(20);
  expect(surfaceBox!.width).toBe(350);
  expect(Math.round(surfaceBox!.y + surfaceBox!.height)).toBe(844);

  const categoryRow = drawer.locator("label").filter({ hasText: "Martial Arts" });
  expect((await categoryRow.boundingBox())!.height).toBeGreaterThanOrEqual(44);

  await page.mouse.click(5, 5);
  await expect(drawer).toHaveCount(0);
  await expect(categoryButton).toBeFocused();

  await categoryButton.click();
  await page.keyboard.press("Escape");
  await expect(drawer).toHaveCount(0);
  await expect(categoryButton).toBeFocused();

  const clearFilters = page.locator('[data-clear-filters="mobile"]');
  await expect(clearFilters).toBeVisible();
  await clearFilters.click();
  await expect(categoryButton).toHaveText("Categories");
  await expect(page).not.toHaveURL(/category=/);

  await page.setViewportSize({ width: 800, height: 900 });
  expect((await filterColumn.boundingBox())!.width).toBe(260);
  expect((await courseColumn.boundingBox())!.width).toBeGreaterThan(440);
  await expect(filterColumn).toHaveCSS("top", "90px");
  await expect(filterColumn).toHaveCSS("max-height", "786px");
  await expect(filterColumn).toHaveCSS("overflow-y", "auto");
  await page.evaluate(() => window.scrollTo(0, 500));
  await expect.poll(async () => Math.round((await filterColumn.boundingBox())!.y)).toBe(90);
  await page.evaluate(() => window.scrollTo(0, 0));

  await page.setViewportSize({ width: 1280, height: 720 });
  await expect(categoryButton).toBeHidden();
  const categoriesGroup = page.getByRole("group", { name: "Categories" });
  await expect(categoriesGroup).toBeVisible();
  await expect(categoriesGroup).toHaveCSS("box-shadow", "none");
});

test("loads more courses in place on mobile and keeps desktop pagination", async ({ page }) => {
  await authenticate(page);
  await page.route("**/api/catalog**", async (route) => {
    const requestedPage = Number(new URL(route.request().url()).searchParams.get("page") ?? "1");
    const title = requestedPage === 2 ? "Second course" : "First course";
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        courses: [
          {
            id: title,
            title,
            description: "",
            coverUrl: null,
            category: "Technology",
            instructors: ["Instructor"],
            tags: [],
            lessonCount: 1,
            durationSeconds: 60,
            completedCount: 0,
            progressPercent: 0,
          },
        ],
        categories: [],
        instructors: [],
        tags: [],
        continueWatching: [],
        pagination: { page: requestedPage, pageSize: 1, totalCourses: 2, totalPages: 2 },
      }),
    });
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/library?pageSize=1");
  await expect(page.getByText("First course", { exact: true })).toBeVisible();

  const loadMore = page.getByTestId("load-more-courses");
  await expect(loadMore).toHaveText("Load more");
  await loadMore.click();

  await expect(page.getByText("Second course", { exact: true })).toBeVisible();
  await expect(loadMore).toHaveCount(0);
  await expect(page).not.toHaveURL(/page=2/);

  await page.setViewportSize({ width: 800, height: 900 });
  await expect(page.getByText("Second course", { exact: true })).toBeHidden();
  await expect(page.getByText("Page 1 of 2")).toBeVisible();
});
