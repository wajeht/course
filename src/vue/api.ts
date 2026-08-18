import { hc } from "hono/client";

import type { AppType } from "../app";
import type { ScanStatus } from "../media/types";
import type {
  ChapterDto,
  CatalogFilters,
  CatalogService,
  CourseDetailDto,
  LessonDetailDto,
  LessonDto,
} from "../catalog/catalog.service";
import type { PlaybackResult } from "../routes/api/playback/playback.service";
import type { CatalogPageSize, SettingsDto } from "../routes/api/settings/settings.service";

const apiClient = hc<AppType>("/");

export interface AuthStateDto {
  authenticated: boolean;
  passwordConfigured: boolean;
  setupEnabled: boolean;
  setupTokenRequired: boolean;
}

export type CatalogDto = Awaited<ReturnType<CatalogService["getCatalog"]>>;
export type {
  ChapterDto,
  CatalogFilters,
  CatalogPageSize,
  CourseDetailDto,
  LessonDetailDto,
  LessonDto,
  PlaybackResult,
  ScanStatus,
  SettingsDto,
};

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export function isCatalogResourceNotFound(error: unknown): error is ApiError {
  return error instanceof ApiError && (error.status === 400 || error.status === 404);
}

export async function expectJson<T>(response: Response, notifyUnauthorized = false): Promise<T> {
  const body = (await response.json()) as T | { message?: string };
  if (!response.ok) {
    if (notifyUnauthorized && response.status === 401 && typeof window !== "undefined") {
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

export function expectProtectedJson<T>(response: Response): Promise<T> {
  return expectJson<T>(response, true);
}

export const api = {
  async getAuthState(signal?: AbortSignal): Promise<AuthStateDto> {
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
    await expectProtectedJson(
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
    return expectProtectedJson<CatalogDto>(response);
  },
  async getCourse(courseId: string, signal?: AbortSignal): Promise<CourseDetailDto> {
    const response = await apiClient.api.catalog.courses[":courseId"].$get(
      { param: { courseId } },
      { init: { signal } },
    );
    return expectProtectedJson<CourseDetailDto>(response);
  },
  async getLesson(lessonId: string): Promise<{
    lesson: LessonDetailDto;
    course: CourseDetailDto;
  }> {
    const response = await apiClient.api.catalog.lessons[":lessonId"].$get({
      param: { lessonId },
    });
    return expectProtectedJson(response);
  },
  async openLesson(lessonId: string): Promise<void> {
    const response = await apiClient.api.progress.lessons[":lessonId"].open.$post({
      param: { lessonId },
    });
    await expectProtectedJson(response);
  },
  async preparePlayback(lessonId: string): Promise<PlaybackResult> {
    const response = await apiClient.api.playback[":lessonId"].$post({ param: { lessonId } });
    return expectProtectedJson<PlaybackResult>(response);
  },
  async getConversionStatus(lessonId: string): Promise<PlaybackResult> {
    const response = await apiClient.api.playback[":lessonId"].conversion.$get({
      param: { lessonId },
    });
    return expectProtectedJson<PlaybackResult>(response);
  },
  async retryConversion(lessonId: string): Promise<PlaybackResult> {
    const response = await apiClient.api.playback[":lessonId"].retry.$post({
      param: { lessonId },
    });
    return expectProtectedJson<PlaybackResult>(response);
  },
  async saveProgress(lessonId: string, positionSeconds: number): Promise<void> {
    const response = await apiClient.api.progress.lessons[":lessonId"].$put({
      param: { lessonId },
      json: { positionSeconds },
    });
    await expectProtectedJson(response);
  },
  async completeLesson(lessonId: string): Promise<void> {
    const response = await apiClient.api.progress.lessons[":lessonId"].complete.$post({
      param: { lessonId },
    });
    await expectProtectedJson(response);
  },
  async resetLesson(lessonId: string): Promise<void> {
    const response = await apiClient.api.progress.lessons[":lessonId"].$delete({
      param: { lessonId },
    });
    await expectProtectedJson(response);
  },
  async resetCourse(courseId: string): Promise<void> {
    const response = await apiClient.api.progress.courses[":courseId"].$delete({
      param: { courseId },
    });
    await expectProtectedJson(response);
  },
  async getSettings(signal?: AbortSignal): Promise<SettingsDto> {
    return expectProtectedJson<SettingsDto>(
      await apiClient.api.settings.$get({}, { init: { signal } }),
    );
  },
  async updateSettings(catalogPageSize: CatalogPageSize): Promise<SettingsDto> {
    return expectProtectedJson<SettingsDto>(
      await apiClient.api.settings.$put({ json: { catalogPageSize } }),
    );
  },
  async getScanStatus(signal?: AbortSignal): Promise<ScanStatus> {
    return expectProtectedJson<ScanStatus>(await apiClient.api.scan.$get({}, { init: { signal } }));
  },
  async rescanCatalog(): Promise<ScanStatus> {
    return expectProtectedJson<ScanStatus>(await apiClient.api.scan.$post());
  },
};
