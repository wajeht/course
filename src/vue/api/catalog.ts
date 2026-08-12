import type {
  CatalogFilters,
  CatalogService,
  CourseDetailDto,
  LessonDto,
} from "../../routes/api/catalog/catalog.service";
import { apiClient, expectProtectedJson } from "./client.js";

export type CatalogDto = Awaited<ReturnType<CatalogService["getCatalog"]>>;
export type { CatalogFilters, CourseDetailDto, LessonDto };

export const catalogApi = {
  async getCatalog(filters: CatalogFilters = {}, signal?: AbortSignal): Promise<CatalogDto> {
    const response = await apiClient.api.catalog.$get(
      {
        query: {
          ...filters,
          page: filters.page === undefined ? undefined : String(filters.page),
          pageSize: filters.pageSize === undefined ? undefined : String(filters.pageSize),
        },
      },
      { init: { signal } },
    );
    return expectProtectedJson<CatalogDto>(response);
  },
  async getCourse(courseId: string, signal?: AbortSignal): Promise<CourseDetailDto> {
    const response = await apiClient.api.catalog.courses[":courseId"].$get(
      { param: { courseId } },
      { init: { signal } },
    );
    return expectProtectedJson<CourseDetailDto>(response);
  },
  async getLesson(lessonId: string): Promise<{ lesson: LessonDto; course: CourseDetailDto }> {
    const response = await apiClient.api.catalog.lessons[":lessonId"].$get({
      param: { lessonId },
    });
    return expectProtectedJson(response);
  },
};
