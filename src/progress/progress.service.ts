import type { CatalogRepository } from "../catalog/catalog.repository.js";
import type { ProgressRepository } from "./progress.repository.js";

export interface ProgressService {
  openLesson(lessonId: string): Promise<boolean>;
  updateProgress(lessonId: string, positionSeconds: number): Promise<boolean>;
  completeLesson(lessonId: string): Promise<boolean>;
  resetLesson(lessonId: string): Promise<void>;
  resetCourse(courseId: string): Promise<void>;
}

export function createProgressService(
  repository: ProgressRepository,
  catalog: CatalogRepository,
): ProgressService {
  return {
    async openLesson(lessonId) {
      if (!(await catalog.findLesson(lessonId))) return false;
      await repository.markOpened(lessonId);
      return true;
    },
    async updateProgress(lessonId, positionSeconds) {
      const video = await catalog.findLesson(lessonId);
      if (!video) return false;
      if (positionSeconds <= 0) return true;
      await repository.savePosition(
        lessonId,
        Math.min(positionSeconds, Number(video.duration_seconds)),
      );
      return true;
    },
    async completeLesson(lessonId) {
      const video = await catalog.findLesson(lessonId);
      if (!video) return false;
      await repository.completeLesson(lessonId, Number(video.duration_seconds));
      return true;
    },
    resetLesson: (lessonId) => repository.resetLesson(lessonId),
    resetCourse: (courseId) => repository.resetCourse(courseId),
  };
}
