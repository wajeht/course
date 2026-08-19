// @vitest-environment happy-dom

import { describe, expect, it } from "vitest";

import { notFoundLocation, router } from "./router.js";

describe("router error pages", () => {
  it("provides separate Library and Access settings routes", () => {
    const library = router.resolve("/settings/library");
    const access = router.resolve("/settings/access");

    expect(library.name).toBe("settings-library");
    expect(library.meta.navigation).toBe("settings");
    expect(access.name).toBe("settings-access");
    expect(access.meta.navigation).toBe("settings");
  });

  it("does not retain the old combined settings route", () => {
    const route = router.resolve("/settings");

    expect(route.name).toBe("not-found");
    expect(route.redirectedFrom).toBeUndefined();
  });

  it("resolves unknown frontend URLs to the not-found page", () => {
    const route = router.resolve("/missing/course/page");

    expect(route.name).toBe("not-found");
    expect(route.meta.title).toBe("Page not found");
    expect(route.redirectedFrom).toBeUndefined();
  });

  it("keeps a missing resource URL while matching the not-found page", () => {
    const route = router.resolve(notFoundLocation("/courses/missing"));

    expect(route.path).toBe("/courses/missing");
    expect(route.name).toBe("not-found");
  });
});
