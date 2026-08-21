import { describe, expect, it } from "vitest";

import type { CatalogDto, LessonPlayerDetailDto } from "@/api.js";
import {
  catalogQueryOptions,
  createCourseQueryClient,
  lessonQueryOptions,
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

function lessonDetail(): LessonPlayerDetailDto {
  const courseId = "a".repeat(24);
  const lessonId = "b".repeat(24);
  const lesson = {
    id: lessonId,
    courseId,
    courseTitle: "Course",
    courseCoverUrl: null,
    sectionId: null,
    sectionTitle: null,
    title: "Lesson",
    durationSeconds: 600,
    positionSeconds: 0,
    completed: false,
    progressPercent: 0,
  };
  return {
    lesson: { ...lesson, chapters: [] },
    course: {
      id: courseId,
      title: "Course",
      description: "",
      category: "Uncategorized",
      instructors: [],
      tags: [],
      coverUrl: null,
      lessonCount: 1,
      completedCount: 0,
      progressPercent: 0,
      durationSeconds: 600,
      sections: [{ id: null, title: "Lessons", lessons: [lesson] }],
    },
  };
}

describe("course query client", () => {
  it("reuses fresh catalog data instead of fetching it again", async () => {
    let requests = 0;
    const client = {
      async getCatalog() {
        requests++;
        return catalog();
      },
    };
    const queryClient = createCourseQueryClient();
    await queryClient.fetchQuery(catalogQueryOptions({}, client));
    await queryClient.fetchQuery(catalogQueryOptions({ page: 1 }, client));

    expect(requests).toBe(1);
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

  it("reuses lesson detail prefetched before player navigation", async () => {
    let requests = 0;
    const client = {
      async getLesson() {
        requests++;
        return lessonDetail();
      },
    };
    const queryClient = createCourseQueryClient();
    const lessonId = "b".repeat(24);

    await queryClient.prefetchQuery(lessonQueryOptions(lessonId, client));
    await queryClient.fetchQuery(lessonQueryOptions(lessonId, client));

    expect(requests).toBe(1);
    queryClient.clear();
  });

  it("keeps settings fresh until they are updated explicitly", () => {
    expect(settingsQueryOptions().staleTime).toBe(Infinity);
  });
});
