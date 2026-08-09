import { hc } from "hono/client";

import type { AppType } from "../../app";
import type { ScanStatus } from "../../media/types";
import type {
  CatalogService,
  CourseDetailDto,
  LessonDto,
} from "../../routes/api/catalog/catalog.service";
import type { PlaybackResult } from "../../routes/api/playback/playback.service";

const client = hc<AppType>("/");

export type CatalogDto = Awaited<ReturnType<CatalogService["catalog"]>>;
export type { CourseDetailDto, LessonDto, PlaybackResult, ScanStatus };

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
  async catalog(query?: string): Promise<CatalogDto> {
    const response = await client.api.catalog.$get({ query: { query } });
    return expectJson<CatalogDto>(response);
  },
  async course(courseId: string): Promise<CourseDetailDto> {
    const response = await client.api.catalog.courses[":courseId"].$get({ param: { courseId } });
    return expectJson<CourseDetailDto>(response);
  },
  async lesson(lessonId: string): Promise<{ lesson: LessonDto; course: CourseDetailDto }> {
    const response = await client.api.catalog.lessons[":lessonId"].$get({ param: { lessonId } });
    return expectJson(response);
  },
  async playback(lessonId: string): Promise<PlaybackResult> {
    const response = await client.api.playback[":lessonId"].$get({ param: { lessonId } });
    return expectJson<PlaybackResult>(response);
  },
  async conversion(lessonId: string): Promise<PlaybackResult> {
    const response = await client.api.playback[":lessonId"].conversion.$get({
      param: { lessonId },
    });
    return expectJson<PlaybackResult>(response);
  },
  async retryConversion(lessonId: string): Promise<PlaybackResult> {
    const response = await client.api.playback[":lessonId"].retry.$post({ param: { lessonId } });
    return expectJson<PlaybackResult>(response);
  },
  async saveProgress(lessonId: string, positionSeconds: number): Promise<void> {
    const response = await client.api.progress.lessons[":lessonId"].$put({
      param: { lessonId },
      json: { positionSeconds },
    });
    await expectJson(response);
  },
  async completeLesson(lessonId: string): Promise<void> {
    const response = await client.api.progress.lessons[":lessonId"].complete.$post({
      param: { lessonId },
    });
    await expectJson(response);
  },
  async resetLesson(lessonId: string): Promise<void> {
    const response = await client.api.progress.lessons[":lessonId"].$delete({
      param: { lessonId },
    });
    await expectJson(response);
  },
  async resetCourse(courseId: string): Promise<void> {
    const response = await client.api.progress.courses[":courseId"].$delete({
      param: { courseId },
    });
    await expectJson(response);
  },
  async scanStatus(): Promise<ScanStatus> {
    return expectJson<ScanStatus>(await client.api.scan.$get());
  },
  async rescan(): Promise<ScanStatus> {
    return expectJson<ScanStatus>(await client.api.scan.$post());
  },
};
