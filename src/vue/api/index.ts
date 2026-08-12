import { authApi } from "./auth.js";
import { catalogApi } from "./catalog.js";
import { playbackApi } from "./playback.js";
import { progressApi } from "./progress.js";
import { scanApi } from "./scan.js";

export { ApiError } from "./client.js";
export type { AuthStateDto } from "./auth.js";
export type { CatalogDto, CatalogFilters, CourseDetailDto, LessonDto } from "./catalog.js";
export type { PlaybackResult } from "./playback.js";
export type { ScanStatus } from "./scan.js";

export const api = {
  ...authApi,
  ...catalogApi,
  ...playbackApi,
  ...progressApi,
  ...scanApi,
};
