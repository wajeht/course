import { describe, expect, it, vi } from "vitest";

import type { CatalogDto } from "@/api.js";
import { catalogQueryOptions, createCourseQueryClient } from "@/queries.js";

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
});
