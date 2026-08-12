import { hc } from "hono/client";

import type { AppType } from "../app";
import type { ScanStatus } from "../media/types";
import type {
  CatalogFilters,
  CatalogService,
  CourseDetailDto,
  LessonDto,
} from "../routes/api/catalog/catalog.service";
import type { PlaybackResult } from "../routes/api/playback/playback.service";

const apiClient = hc<AppType>("/");

export type CatalogDto = Awaited<ReturnType<CatalogService["getCatalog"]>>;
export type { CatalogFilters, CourseDetailDto, LessonDto, PlaybackResult, ScanStatus };

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function expectJson<T>(response: Response): Promise<T> {
  const body = (await response.json()) as T | { message?: string };
  if (!response.ok) {
    if (response.status === 401 && typeof window !== "undefined") {
      window.dispatchEvent(new Event("course:unauthorized"));
    }
    throw new ApiError(
      "message" in (body as object)
        ? ((body as { message?: string }).message ?? "Request failed")
        : "Request failed",
      response.status,
    );
  }
  return body as T;
}

export const api = {
  async getAuthState(signal?: AbortSignal): Promise<{
    authenticated: boolean;
    passwordConfigured: boolean;
    setupEnabled: boolean;
    setupTokenRequired: boolean;
  }> {
    return expectJson(await apiClient.api.auth.me.$get({}, { init: { signal } }));
  },
  async login(password: string): Promise<void> {
    await expectJson(await apiClient.api.auth.$post({ json: { password } }));
  },
  async logout(): Promise<void> {
    await expectJson(await apiClient.api.auth.logout.$post());
  },
  async setupPassword(
    password: string,
    confirmPassword: string,
    setupToken?: string,
  ): Promise<void> {
    await expectJson(
      await apiClient.api.auth.password.$post({
        json: { password, confirmPassword, setupToken },
      }),
    );
  },
  async changePassword(
    currentPassword: string,
    newPassword: string,
    confirmPassword: string,
  ): Promise<void> {
    await expectJson(
      await apiClient.api.auth.password.$put({
        json: { currentPassword, newPassword, confirmPassword },
      }),
    );
  },
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
    return expectJson<CatalogDto>(response);
  },
  async getCourse(courseId: string, signal?: AbortSignal): Promise<CourseDetailDto> {
    const response = await apiClient.api.catalog.courses[":courseId"].$get(
      { param: { courseId } },
      { init: { signal } },
    );
    return expectJson<CourseDetailDto>(response);
  },
  async getLesson(lessonId: string): Promise<{ lesson: LessonDto; course: CourseDetailDto }> {
    const response = await apiClient.api.catalog.lessons[":lessonId"].$get({ param: { lessonId } });
    return expectJson(response);
  },
  async preparePlayback(lessonId: string): Promise<PlaybackResult> {
    const response = await apiClient.api.playback[":lessonId"].$get({ param: { lessonId } });
    return expectJson<PlaybackResult>(response);
  },
  async getConversionStatus(lessonId: string): Promise<PlaybackResult> {
    const response = await apiClient.api.playback[":lessonId"].conversion.$get({
      param: { lessonId },
    });
    return expectJson<PlaybackResult>(response);
  },
  async retryConversion(lessonId: string): Promise<PlaybackResult> {
    const response = await apiClient.api.playback[":lessonId"].retry.$post({ param: { lessonId } });
    return expectJson<PlaybackResult>(response);
  },
  async saveProgress(lessonId: string, positionSeconds: number): Promise<void> {
    const response = await apiClient.api.progress.lessons[":lessonId"].$put({
      param: { lessonId },
      json: { positionSeconds },
    });
    await expectJson(response);
  },
  async completeLesson(lessonId: string): Promise<void> {
    const response = await apiClient.api.progress.lessons[":lessonId"].complete.$post({
      param: { lessonId },
    });
    await expectJson(response);
  },
  async resetLesson(lessonId: string): Promise<void> {
    const response = await apiClient.api.progress.lessons[":lessonId"].$delete({
      param: { lessonId },
    });
    await expectJson(response);
  },
  async resetCourse(courseId: string): Promise<void> {
    const response = await apiClient.api.progress.courses[":courseId"].$delete({
      param: { courseId },
    });
    await expectJson(response);
  },
  async getScanStatus(signal?: AbortSignal): Promise<ScanStatus> {
    return expectJson<ScanStatus>(await apiClient.api.scan.$get({}, { init: { signal } }));
  },
  async rescanCatalog(): Promise<ScanStatus> {
    return expectJson<ScanStatus>(await apiClient.api.scan.$post());
  },
};
