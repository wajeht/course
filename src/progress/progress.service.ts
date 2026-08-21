import type { LibraryRepository } from "../library/library.repository.js";
import type { ProgressRepository } from "./progress.repository.js";

export interface ProgressService {
  openVideo(videoId: string): Promise<boolean>;
  updateProgress(videoId: string, positionSeconds: number): Promise<boolean>;
  completeVideo(videoId: string): Promise<boolean>;
  resetVideo(videoId: string): Promise<void>;
  resetPlaylist(playlistId: string): Promise<void>;
}

export function createProgressService(
  repository: ProgressRepository,
  library: LibraryRepository,
): ProgressService {
  return {
    async openVideo(videoId) {
      if (!(await library.findVideo(videoId))) return false;
      await repository.markOpened(videoId);
      return true;
    },
    async updateProgress(videoId, positionSeconds) {
      const video = await library.findVideo(videoId);
      if (!video) return false;
      if (positionSeconds <= 0) return true;
      await repository.savePosition(
        videoId,
        Math.min(positionSeconds, Number(video.duration_seconds)),
      );
      return true;
    },
    async completeVideo(videoId) {
      const video = await library.findVideo(videoId);
      if (!video) return false;
      await repository.completeVideo(videoId, Number(video.duration_seconds));
      return true;
    },
    resetVideo: (videoId) => repository.resetVideo(videoId),
    resetPlaylist: (playlistId) => repository.resetPlaylist(playlistId),
  };
}
