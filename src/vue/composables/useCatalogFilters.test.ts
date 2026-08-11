import { effectScope, nextTick } from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { CatalogDto, ScanStatus } from "../api.js";
import { useCatalogFilters } from "./useCatalogFilters.js";

function catalog(title = "Course"): CatalogDto {
  return {
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
  };
}

function scanStatus(): ScanStatus {
  return {
    startedAt: "2026-08-11T00:00:00.000Z",
    completedAt: "2026-08-11T00:00:01.000Z",
    status: "complete",
    courseCount: 1,
    lessonCount: 1,
    warnings: [],
    error: null,
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("useCatalogFilters", () => {
  it("loads the catalog and scan status", async () => {
    const client = {
      getCatalog: vi.fn(async () => catalog()),
      getScanStatus: vi.fn(async () => scanStatus()),
    };
    const scope = effectScope();
    const filters = scope.run(() => useCatalogFilters(client, 0));
    if (!filters) throw new Error("Composable did not initialize");

    await filters.initializeCatalog();

    expect(filters.catalog.value.courses[0]?.title).toBe("Course");
    expect(filters.scanStatus.value?.status).toBe("complete");
    expect(filters.catalogLoaded.value).toBe(true);
    expect(filters.loading.value).toBe(false);
    expect(filters.refreshing.value).toBe(false);
    scope.stop();
  });

  it("debounces text searches", async () => {
    vi.useFakeTimers();
    const client = {
      getCatalog: vi.fn(async () => catalog()),
      getScanStatus: vi.fn(async () => scanStatus()),
    };
    const scope = effectScope();
    const filters = scope.run(() => useCatalogFilters(client, 220));
    if (!filters) throw new Error("Composable did not initialize");

    filters.query.value = "guard";
    await nextTick();
    await vi.advanceTimersByTimeAsync(219);
    expect(client.getCatalog).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);

    expect(client.getCatalog).toHaveBeenCalledWith({
      query: "guard",
      category: undefined,
      instructor: undefined,
      tag: undefined,
    });
    expect(filters.libraryTitle.value).toBe("1 matching course");
    scope.stop();
  });

  it("applies dropdown filters immediately", async () => {
    const client = {
      getCatalog: vi.fn(async () => catalog()),
      getScanStatus: vi.fn(async () => scanStatus()),
    };
    const scope = effectScope();
    const filters = scope.run(() => useCatalogFilters(client, 220));
    if (!filters) throw new Error("Composable did not initialize");

    filters.selectedCategory.value = "Martial Arts";
    filters.selectedInstructor.value = "John Danaher";
    filters.selectedTag.value = "BJJ";
    await nextTick();

    expect(client.getCatalog).toHaveBeenCalledWith({
      query: undefined,
      category: "Martial Arts",
      instructor: "John Danaher",
      tag: "BJJ",
    });
    scope.stop();
  });

  it("keeps existing courses visible while refreshing", async () => {
    vi.useFakeTimers();
    let resolveRefresh: ((value: CatalogDto) => void) | undefined;
    const refresh = new Promise<CatalogDto>((resolve) => {
      resolveRefresh = resolve;
    });
    const client = {
      getCatalog: vi
        .fn()
        .mockResolvedValueOnce(catalog("Existing result"))
        .mockReturnValue(refresh),
      getScanStatus: vi.fn(async () => scanStatus()),
    };
    const scope = effectScope();
    const filters = scope.run(() => useCatalogFilters(client, 0));
    if (!filters) throw new Error("Composable did not initialize");
    await filters.initializeCatalog();

    filters.query.value = "new";
    await nextTick();
    await vi.advanceTimersByTimeAsync(0);

    expect(filters.loading.value).toBe(true);
    expect(filters.refreshing.value).toBe(true);
    expect(filters.catalog.value.courses[0]?.title).toBe("Existing result");

    resolveRefresh?.(catalog("New result"));
    await Promise.resolve();
    await nextTick();
    expect(filters.catalog.value.courses[0]?.title).toBe("New result");
    expect(filters.refreshing.value).toBe(false);
    scope.stop();
  });

  it("ignores a stale catalog response", async () => {
    let resolveFirst: ((value: CatalogDto) => void) | undefined;
    let resolveSecond: ((value: CatalogDto) => void) | undefined;
    const first = new Promise<CatalogDto>((resolve) => {
      resolveFirst = resolve;
    });
    const second = new Promise<CatalogDto>((resolve) => {
      resolveSecond = resolve;
    });
    const client = {
      getCatalog: vi.fn().mockReturnValueOnce(first).mockReturnValueOnce(second),
      getScanStatus: vi.fn(async () => scanStatus()),
    };
    const scope = effectScope();
    const filters = scope.run(() => useCatalogFilters(client, 0));
    if (!filters) throw new Error("Composable did not initialize");

    const firstLoad = filters.initializeCatalog();
    filters.query.value = "new";
    const secondLoad = filters.initializeCatalog();
    resolveSecond?.(catalog("New result"));
    await secondLoad;
    resolveFirst?.(catalog("Old result"));
    await firstLoad;

    expect(filters.catalog.value.courses[0]?.title).toBe("New result");
    scope.stop();
  });
});
