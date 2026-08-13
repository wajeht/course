import type { Knex } from "knex";

export type ConversionState = "queued" | "converting" | "ready" | "failed";

export interface ConversionRecord {
  lessonId: string;
  status: ConversionState;
  progress: number;
  playlistPath: string | null;
  error: string | null;
}

export interface ConversionRepository {
  getConversion(lessonId: string): Promise<ConversionRecord | null>;
  queueConversion(lessonId: string): Promise<void>;
  markConverting(lessonId: string, playlistPath: string): Promise<void>;
  updateProgress(lessonId: string, progress: number): Promise<void>;
  markReady(lessonId: string, playlistPath: string): Promise<void>;
  markFailed(lessonId: string, error: string): Promise<void>;
  listPendingLessonIds(): Promise<string[]>;
}

interface ConversionUpdate {
  status?: ConversionState;
  progress?: number;
  playlist_path?: string | null;
  error?: string | null;
}

export function createConversionRepository(database: Knex): ConversionRepository {
  async function update(lessonId: string, values: ConversionUpdate): Promise<void> {
    await database("conversion_jobs")
      .where({ lesson_id: lessonId })
      .update({ ...values, updated_at: new Date().toISOString() });
  }

  return {
    async getConversion(lessonId) {
      const row = await database("conversion_jobs").where({ lesson_id: lessonId }).first();
      if (!row) return null;
      // SAFETY: Knex returns the columns selected from the locally owned conversion_jobs schema.
      return {
        lessonId: row.lesson_id as string,
        status: row.status as ConversionState,
        progress: Number(row.progress),
        playlistPath: row.playlist_path as string | null,
        error: row.error as string | null,
      };
    },
    async queueConversion(lessonId) {
      const now = new Date().toISOString();
      await database("conversion_jobs")
        .insert({
          lesson_id: lessonId,
          status: "queued",
          progress: 0,
          playlist_path: null,
          error: null,
          created_at: now,
          updated_at: now,
        })
        .onConflict("lesson_id")
        .merge({
          status: "queued",
          progress: 0,
          playlist_path: null,
          error: null,
          updated_at: now,
        });
    },
    markConverting: (lessonId, playlistPath) =>
      update(lessonId, { status: "converting", playlist_path: playlistPath, error: null }),
    updateProgress: (lessonId, progress) => update(lessonId, { progress }),
    markReady: (lessonId, playlistPath) =>
      update(lessonId, {
        status: "ready",
        progress: 100,
        playlist_path: playlistPath,
        error: null,
      }),
    markFailed: (lessonId, error) => update(lessonId, { status: "failed", error }),
    async listPendingLessonIds() {
      const rows = await database("conversion_jobs")
        .whereIn("status", ["queued", "converting"])
        .select("lesson_id");
      // SAFETY: This query selects lesson_id from the locally owned conversion_jobs schema.
      return rows.map((row) => row.lesson_id as string);
    },
  };
}
