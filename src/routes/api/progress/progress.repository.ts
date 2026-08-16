import type { Knex } from "knex";

export interface ProgressRepository {
  markOpened(lessonId: string): Promise<void>;
  savePosition(lessonId: string, positionSeconds: number): Promise<void>;
  completeLesson(lessonId: string, positionSeconds: number): Promise<void>;
  resetLesson(lessonId: string): Promise<void>;
  resetCourse(courseId: string): Promise<void>;
}

export function createProgressRepository(database: Knex): ProgressRepository {
  return {
    async markOpened(lessonId) {
      await database("progress")
        .where({ lesson_id: lessonId, completed: false })
        .where("position_seconds", ">", 0)
        .update({ updated_at: new Date().toISOString() });
    },

    async savePosition(lessonId, positionSeconds) {
      const now = new Date().toISOString();
      await database("progress")
        .insert({
          lesson_id: lessonId,
          position_seconds: positionSeconds,
          completed: false,
          updated_at: now,
        })
        .onConflict("lesson_id")
        .merge({
          position_seconds: database.raw(
            "CASE WHEN progress.completed = 1 THEN progress.position_seconds ELSE excluded.position_seconds END",
          ),
          updated_at: now,
        });
    },

    async completeLesson(lessonId, positionSeconds) {
      const now = new Date().toISOString();
      await database("progress")
        .insert({
          lesson_id: lessonId,
          position_seconds: positionSeconds,
          completed: true,
          updated_at: now,
        })
        .onConflict("lesson_id")
        .merge({ position_seconds: positionSeconds, completed: true, updated_at: now });
    },

    async resetLesson(lessonId) {
      await database("progress").where({ lesson_id: lessonId }).delete();
    },

    async resetCourse(courseId) {
      await database("progress")
        .whereIn("lesson_id", database("lessons").select("id").where({ course_id: courseId }))
        .delete();
    },
  };
}
