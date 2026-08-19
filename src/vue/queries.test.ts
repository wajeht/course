import { describe, expect, it, vi } from "vitest";

import type { CatalogDto } from "@/api.js";
import {
  catalogQueryOptions,
  createCourseQueryClient,
  queryKeys,
  settingsQueryOptions,
} from "@/queries.js";

function catalog(): CatalogDto {
  return {
    courses: [],
    categories: [],
    instructors: [],
    tags: [],
    continueWatching: [],
    pagination: { page: 1, pageSize: 24, totalCourses: 0, totalPages: 0 },
  };
}

describe("course query client", () => {
  it("reuses fresh catalog data instead of fetching it again", async () => {
    const client = { getCatalog: vi.fn(async () => catalog()) };
    const queryClient = createCourseQueryClient();
    await queryClient.fetchQuery(catalogQueryOptions({}, client));
    await queryClient.fetchQuery(catalogQueryOptions({ page: 1 }, client));

    expect(client.getCatalog).toHaveBeenCalledTimes(1);
    queryClient.clear();
  });

  it("keeps course details fresh when only catalog lists are invalidated", async () => {
    const queryClient = createCourseQueryClient();
    const courseKey = queryKeys.course("a".repeat(24));
    queryClient.setQueryData(courseKey, { title: "Course" });

    await queryClient.invalidateQueries({ queryKey: queryKeys.catalog, refetchType: "none" });

    expect(queryClient.getQueryState(courseKey)?.isInvalidated).toBe(false);
    queryClient.clear();
  });

  it("keeps settings fresh until they are updated explicitly", () => {
    expect(settingsQueryOptions().staleTime).toBe(Infinity);
  });
});
