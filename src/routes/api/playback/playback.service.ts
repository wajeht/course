import fs from "node:fs/promises";

import type { CatalogService } from "../catalog/catalog.service.js";
import type { ConversionManager } from "../../../media/conversion.js";
import type { ConversionRecord } from "../../../media/conversion.repository.js";

export interface PlaybackService {
  preparePlayback(lessonId: string): Promise<PlaybackResult | null>;
  retryConversion(lessonId: string): Promise<PlaybackResult | null>;
  getConversionStatus(lessonId: string): Promise<PlaybackResult | null>;
}

export type PlaybackResult =
  | { kind: "direct"; url: string }
  | { kind: "hls"; url: string; status: "converting" | "ready"; progress: number }
  | { kind: "converting"; status: "queued" | "converting"; progress: number }
  | { kind: "error"; message: string };

async function resolveConversionPlayback(record: ConversionRecord): Promise<PlaybackResult> {
  if (record.status === "failed")
    return { kind: "error", message: record.error ?? "Conversion failed" };
  if (record.playlistPath) {
    try {
      await fs.access(record.playlistPath);
      return {
        kind: "hls",
        url: `/hls/${record.lessonId}/index.m3u8`,
        status: record.status === "ready" ? "ready" : "converting",
        progress: record.progress,
      };
    } catch {
      // The playlist may not exist until FFmpeg writes its first segment.
    }
  }
  return {
    kind: "converting",
    status: record.status === "ready" ? "converting" : record.status,
    progress: record.progress,
  };
}

export function createPlaybackService(
  catalog: CatalogService,
  conversions: ConversionManager,
): PlaybackService {
  return {
    async preparePlayback(lessonId) {
      const lesson = await catalog.findLessonRecord(lessonId);
      if (!lesson) return null;
      if (lesson.browser_compatible !== 0) return { kind: "direct", url: `/media/${lessonId}` };
      return resolveConversionPlayback(await conversions.requestConversion(lesson));
    },
    async retryConversion(lessonId) {
      const lesson = await catalog.findLessonRecord(lessonId);
      return lesson ? resolveConversionPlayback(await conversions.retryConversion(lesson)) : null;
    },
    async getConversionStatus(lessonId) {
      const record = await conversions.getConversion(lessonId);
      return record ? resolveConversionPlayback(record) : null;
    },
  };
}
