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
  get(lessonId: string): Promise<ConversionRecord | null>;
  queue(lessonId: string): Promise<void>;
  converting(lessonId: string, playlistPath: string): Promise<void>;
  updateProgress(lessonId: string, progress: number): Promise<void>;
  ready(lessonId: string, playlistPath: string): Promise<void>;
  fail(lessonId: string, error: string): Promise<void>;
  pendingLessonIds(): Promise<string[]>;
}

export function createConversionRepository(database: Knex): ConversionRepository {
  async function update(lessonId: string, values: Record<string, unknown>): Promise<void> {
    await database("conversion_jobs")
      .where({ lesson_id: lessonId })
      .update({ ...values, updated_at: new Date().toISOString() });
  }

  return {
    async get(lessonId) {
      const row = await database("conversion_jobs").where({ lesson_id: lessonId }).first();
      if (!row) return null;
      return {
        lessonId: row.lesson_id as string,
        status: row.status as ConversionState,
        progress: Number(row.progress),
        playlistPath: row.playlist_path as string | null,
        error: row.error as string | null,
      };
    },
    async queue(lessonId) {
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
    converting: (lessonId, playlistPath) =>
      update(lessonId, { status: "converting", playlist_path: playlistPath, error: null }),
    updateProgress: (lessonId, progress) => update(lessonId, { progress }),
    ready: (lessonId, playlistPath) =>
      update(lessonId, {
        status: "ready",
        progress: 100,
        playlist_path: playlistPath,
        error: null,
      }),
    fail: (lessonId, error) => update(lessonId, { status: "failed", error }),
    async pendingLessonIds() {
      const rows = await database("conversion_jobs")
        .whereIn("status", ["queued", "converting"])
        .select("lesson_id");
      return rows.map((row) => row.lesson_id as string);
    },
  };
}
