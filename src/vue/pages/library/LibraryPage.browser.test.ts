import { expect, test } from "@playwright/test";

test("filters through the API and uses the responsive mobile sheet", async ({ page }) => {
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
  await expect(categoryButton).toBeVisible();
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

  await page.mouse.click(5, 5);
  await expect(drawer).toHaveCount(0);
  await expect(categoryButton).toBeFocused();

  await categoryButton.click();
  await page.keyboard.press("Escape");
  await expect(drawer).toHaveCount(0);
  await expect(categoryButton).toBeFocused();

  await page.setViewportSize({ width: 1280, height: 720 });
  await expect(categoryButton).toBeHidden();
  await expect(
    page.locator('input[name="catalog-desktop-category"][value="Technology"]'),
  ).toBeVisible();
});
