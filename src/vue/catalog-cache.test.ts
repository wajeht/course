// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { CatalogDto } from "@/api.js";
import {
  clearCatalogSnapshot,
  isDefaultCatalogRequest,
  readCatalogSnapshot,
  writeCatalogSnapshot,
} from "./catalog-cache.js";

const catalog: CatalogDto = {
  categories: [],
  continueWatching: [],
  courses: [],
  instructors: [],
  pagination: { page: 1, pageSize: 24, totalCourses: 0, totalPages: 0 },
  tags: [],
};

describe("catalog cache", () => {
  beforeEach(() => {
    const values = new Map<string, string>();
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: {
        clear: () => values.clear(),
        getItem: (key: string) => values.get(key) ?? null,
        key: (index: number) => [...values.keys()][index] ?? null,
        get length() {
          return values.size;
        },
        removeItem: (key: string) => values.delete(key),
        setItem: (key: string, value: string) => values.set(key, value),
      },
    });
  });
  afterEach(clearCatalogSnapshot);

  it("stores the latest default library response", () => {
    writeCatalogSnapshot(catalog);

    expect(readCatalogSnapshot()?.catalog.pagination.page).toBe(1);
    expect(readCatalogSnapshot()?.savedAt).toBeTruthy();
  });

  it("only treats the unfiltered first page as the offline library", () => {
    expect(isDefaultCatalogRequest({})).toBe(true);
    expect(isDefaultCatalogRequest({ page: 1, pageSize: 48 })).toBe(true);
    expect(isDefaultCatalogRequest({ page: 2 })).toBe(false);
    expect(isDefaultCatalogRequest({ query: "guard" })).toBe(false);
  });
});
