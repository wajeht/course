import type { Knex } from "knex";

export type ConversionState = "queued" | "converting" | "ready" | "failed";

export interface StoredConversion {
  lessonId: string;
  status: ConversionState;
  progress: number;
  error: string | null;
}

export interface ConversionRepository {
  getConversion(lessonId: string): Promise<StoredConversion | null>;
  queueConversion(lessonId: string): Promise<void>;
  markConverting(lessonId: string): Promise<void>;
  updateProgress(lessonId: string, progress: number): Promise<void>;
  markReady(lessonId: string): Promise<void>;
  markFailed(lessonId: string, error: string): Promise<void>;
  listPendingLessonIds(): Promise<string[]>;
}

export function createConversionRepository(database: Knex): ConversionRepository {
  async function update(lessonId: string, values: Record<string, unknown>): Promise<void> {
    await database("conversions").where({ lesson_id: lessonId }).update(values);
  }

  return {
    async getConversion(lessonId) {
      const row = await database("conversions").where({ lesson_id: lessonId }).first();
      if (!row) return null;
      return {
        lessonId: row.lesson_id as string,
        status: row.status as ConversionState,
        progress: Number(row.progress),
        error: row.error as string | null,
      };
    },
    async queueConversion(lessonId) {
      await database("conversions")
        .insert({
          lesson_id: lessonId,
          status: "queued",
          progress: 0,
          error: null,
        })
        .onConflict("lesson_id")
        .merge({
          status: "queued",
          progress: 0,
          error: null,
        });
    },
    markConverting: (lessonId) => update(lessonId, { status: "converting", error: null }),
    updateProgress: (lessonId, progress) => update(lessonId, { progress }),
    markReady: (lessonId) =>
      update(lessonId, {
        status: "ready",
        progress: 100,
        error: null,
      }),
    markFailed: (lessonId, error) => update(lessonId, { status: "failed", error }),
    async listPendingLessonIds() {
      const rows = await database("conversions")
        .whereIn("status", ["queued", "converting"])
        .select("lesson_id");
      return rows.map((row) => row.lesson_id as string);
    },
  };
}
