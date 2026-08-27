import { hc } from "hono/client";

import type { AppType } from "../app";
import type {
  ChapterDto,
  LibraryFilters,
  LibraryService,
  PlaylistDetailDto,
  VideoDto,
  VideoDetailDto,
} from "../library/library.service";
import type { ScanStatus } from "../media/types";
import type { ThumbnailRegenerationStatus } from "../media/thumbnails";
import type { PlaybackResult } from "../playback/playback.service";
import type { LibraryPageSize, SettingsDto } from "../settings/settings.service";

const apiClient = hc<AppType>("/");

export interface AuthStateDto {
  authenticated: boolean;
  passwordConfigured: boolean;
  setupEnabled: boolean;
  setupTokenRequired: boolean;
}

export type LibraryDto = Awaited<ReturnType<LibraryService["getLibrary"]>>;
export interface VideoPlayerDetailDto {
  video: VideoDetailDto;
  playlist: PlaylistDetailDto | null;
}

export type {
  ChapterDto,
  LibraryFilters,
  LibraryPageSize,
  PlaybackResult,
  PlaylistDetailDto,
  ScanStatus,
  SettingsDto,
  VideoDetailDto,
  VideoDto,
};

const thumbnailPollMilliseconds = 500;
const thumbnailPollLimit = 1_200;

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export function apiErrorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError && error.message.trim() ? error.message : fallback;
}

export function isLibraryResourceNotFound(error: unknown): error is ApiError {
  return error instanceof ApiError && (error.status === 400 || error.status === 404);
}

export async function expectJson<T>(response: Response, notifyUnauthorized = false): Promise<T> {
  const body = (await response.json()) as T | { message?: string };
  if (!response.ok) {
    if (notifyUnauthorized && response.status === 401 && typeof window !== "undefined") {
      window.dispatchEvent(new Event("videos:unauthorized"));
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
      await apiClient.api.auth.password.$post({ json: { password, confirmPassword, setupToken } }),
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
  async getLibrary(filters: LibraryFilters = {}, signal?: AbortSignal): Promise<LibraryDto> {
    const response = await apiClient.api.library.$get(
      {
        query: {
          ...filters,
          page: filters.page === undefined ? undefined : String(filters.page),
          pageSize: filters.pageSize === undefined ? undefined : String(filters.pageSize),
        },
      },
      { init: { signal } },
    );
    return expectProtectedJson<LibraryDto>(response);
  },
  async getVideo(videoId: string, signal?: AbortSignal): Promise<VideoPlayerDetailDto> {
    return expectProtectedJson<VideoPlayerDetailDto>(
      await apiClient.api.videos[":videoId"].$get({ param: { videoId } }, { init: { signal } }),
    );
  },
  async regenerateVideoThumbnail(videoId: string): Promise<void> {
    let status = await expectProtectedJson<ThumbnailRegenerationStatus>(
      await apiClient.api.videos[":videoId"].thumbnail.$post({
        param: { videoId },
      }),
    );
    for (let attempt = 0; attempt < thumbnailPollLimit; attempt += 1) {
      if (status.status === "complete") return;
      if (status.status === "failed" || status.status === "idle") {
        throw new ApiError("Could not regenerate thumbnails", 500);
      }
      await wait(thumbnailPollMilliseconds);
      status = await expectProtectedJson<ThumbnailRegenerationStatus>(
        await apiClient.api.videos[":videoId"].thumbnail.$get({
          param: { videoId },
        }),
      );
    }
    throw new ApiError("Thumbnail regeneration timed out", 408);
  },
  async preparePlayback(videoId: string): Promise<PlaybackResult> {
    return expectProtectedJson<PlaybackResult>(
      await apiClient.api.playback[":videoId"].$post({ param: { videoId } }),
    );
  },
  async openVideo(videoId: string): Promise<void> {
    await expectProtectedJson(
      await apiClient.api.progress.videos[":videoId"].open.$post({ param: { videoId } }),
    );
  },
  async getConversionStatus(videoId: string): Promise<PlaybackResult> {
    return expectProtectedJson<PlaybackResult>(
      await apiClient.api.playback[":videoId"].conversion.$get({ param: { videoId } }),
    );
  },
  async retryConversion(videoId: string): Promise<PlaybackResult> {
    return expectProtectedJson<PlaybackResult>(
      await apiClient.api.playback[":videoId"].retry.$post({ param: { videoId } }),
    );
  },
  async saveProgress(videoId: string, positionSeconds: number): Promise<void> {
    await expectProtectedJson(
      await apiClient.api.progress.videos[":videoId"].$put({
        param: { videoId },
        json: { positionSeconds },
      }),
    );
  },
  async completeVideo(videoId: string): Promise<void> {
    await expectProtectedJson(
      await apiClient.api.progress.videos[":videoId"].complete.$post({ param: { videoId } }),
    );
  },
  async resetVideo(videoId: string): Promise<void> {
    await expectProtectedJson(
      await apiClient.api.progress.videos[":videoId"].$delete({ param: { videoId } }),
    );
  },
  async resetPlaylist(playlistId: string): Promise<void> {
    await expectProtectedJson(
      await apiClient.api.progress.playlists[":playlistId"].$delete({ param: { playlistId } }),
    );
  },
  async getSettings(signal?: AbortSignal): Promise<SettingsDto> {
    return expectProtectedJson<SettingsDto>(
      await apiClient.api.settings.$get({}, { init: { signal } }),
    );
  },
  async updateSettings(libraryPageSize: LibraryPageSize): Promise<SettingsDto> {
    return expectProtectedJson<SettingsDto>(
      await apiClient.api.settings.$put({ json: { libraryPageSize } }),
    );
  },
  async getScanStatus(signal?: AbortSignal): Promise<ScanStatus> {
    return expectProtectedJson<ScanStatus>(await apiClient.api.scan.$get({}, { init: { signal } }));
  },
  async rescanLibrary(): Promise<ScanStatus> {
    return expectProtectedJson<ScanStatus>(await apiClient.api.scan.$post());
  },
};
