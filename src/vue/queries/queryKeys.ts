import type { CatalogFilters } from "../api.js";

export const catalogKeys = {
  all: ["catalog"] as const,
  lists: () => [...catalogKeys.all, "list"] as const,
  list: (filters: CatalogFilters) => [...catalogKeys.lists(), filters] as const,
  courses: () => [...catalogKeys.all, "course"] as const,
  course: (courseId: string) => [...catalogKeys.courses(), courseId] as const,
  lessons: () => [...catalogKeys.all, "lesson"] as const,
  lesson: (lessonId: string) => [...catalogKeys.lessons(), lessonId] as const,
};

export const scanKeys = {
  all: ["scan-status"] as const,
};
