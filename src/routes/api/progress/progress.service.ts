import type { CatalogRepository } from "../catalog/catalog.repository.js";
import type { ProgressRepository } from "./progress.repository.js";

export interface ProgressService {
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
    async updateProgress(lessonId, positionSeconds) {
      const lesson = await catalog.findLesson(lessonId);
      if (!lesson) return false;
      if (positionSeconds <= 0) return true;
      await repository.savePosition(
        lessonId,
        Math.min(positionSeconds, Number(lesson.duration_seconds)),
      );
      return true;
    },
    async completeLesson(lessonId) {
      const lesson = await catalog.findLesson(lessonId);
      if (!lesson) return false;
      await repository.completeLesson(lessonId, Number(lesson.duration_seconds));
      return true;
    },
    resetLesson: (lessonId) => repository.resetLesson(lessonId),
    resetCourse: (courseId) => repository.resetCourse(courseId),
  };
}
