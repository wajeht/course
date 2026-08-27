import type { Knex } from "knex";

export type ConversionState = "queued" | "converting" | "ready" | "failed";

export interface StoredConversion {
  videoId: string;
  status: ConversionState;
  progress: number;
  error: string | null;
}

export interface ConversionRepository {
  getConversion(videoId: string): Promise<StoredConversion | null>;
  queueConversion(videoId: string): Promise<void>;
  markConverting(videoId: string): Promise<void>;
  updateProgress(videoId: string, progress: number): Promise<void>;
  markReady(videoId: string): Promise<void>;
  markFailed(videoId: string, error: string): Promise<void>;
  listPendingVideoIds(): Promise<string[]>;
}

interface ConversionRow {
  error: string | null;
  progress: number;
  status: ConversionState;
  video_id: string;
}

type ConversionUpdate = Partial<Pick<ConversionRow, "error" | "progress" | "status">>;

export function createConversionRepository(database: Knex): ConversionRepository {
  async function updateConversion(videoId: string, values: ConversionUpdate): Promise<void> {
    await database<ConversionRow>("conversions").where({ video_id: videoId }).update(values);
  }

  return {
    async getConversion(videoId) {
      const row = await database<ConversionRow>("conversions").where({ video_id: videoId }).first();
      if (!row) return null;
      return {
        videoId: row.video_id,
        status: row.status,
        progress: Number(row.progress),
        error: row.error,
      };
    },
    async queueConversion(videoId) {
      await database("conversions")
        .insert({
          video_id: videoId,
          status: "queued",
          progress: 0,
          error: null,
        })
        .onConflict("video_id")
        .merge({
          status: "queued",
          progress: 0,
          error: null,
        });
    },
    markConverting: (videoId) => updateConversion(videoId, { status: "converting", error: null }),
    updateProgress: (videoId, progress) => updateConversion(videoId, { progress }),
    markReady: (videoId) =>
      updateConversion(videoId, {
        status: "ready",
        progress: 100,
        error: null,
      }),
    markFailed: (videoId, error) => updateConversion(videoId, { status: "failed", error }),
    async listPendingVideoIds() {
      const rows = await database<ConversionRow>("conversions")
        .whereIn("status", ["queued", "converting"])
        .select("video_id");
      return rows.map((row) => row.video_id);
    },
  };
}
