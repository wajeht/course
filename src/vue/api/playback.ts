import type { PlaybackResult } from "../../routes/api/playback/playback.service";
import { apiClient, expectProtectedJson } from "./client.js";

export type { PlaybackResult };

export const playbackApi = {
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
};
