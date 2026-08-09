import { spawn } from "node:child_process";
import { constants } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";

import type { Configuration } from "../configuration.js";
import type { CatalogRepository, LessonRow } from "../routes/api/catalog/catalog.repository.js";
import type { Logger } from "../utils/logger.js";
import type { ConversionRecord, ConversionRepository } from "./conversion.repository.js";
import { resolveContainedPath } from "./path.js";

export type ConversionExecutor = (
  lesson: LessonRow,
  onProgress: (progress: number) => Promise<void>,
) => Promise<string>;

export interface ConversionManager {
  requestConversion(lesson: LessonRow): Promise<ConversionRecord>;
  retryConversion(lesson: LessonRow): Promise<ConversionRecord>;
  getConversion(lessonId: string): Promise<ConversionRecord | null>;
  recoverConversions(): Promise<void>;
}

export function createFfmpegConversionExecutor(configuration: Configuration): ConversionExecutor {
  return async (lesson, onProgress) => {
    const source = resolveContainedPath(configuration.media.videosDirectory, lesson.path);
    const outputDirectory = path.join(configuration.media.hlsDirectory, lesson.id);
    const playlist = path.join(outputDirectory, "index.m3u8");
    await fs.rm(outputDirectory, { recursive: true, force: true });
    await fs.mkdir(outputDirectory, { recursive: true });

    const canRemux =
      lesson.video_codec === "h264" &&
      (lesson.audio_codec === null || lesson.audio_codec === "aac");
    const hardwareInputArguments = canRemux
      ? []
      : [
          "-qsv_device",
          configuration.media.qsvDevice,
          "-hwaccel",
          "qsv",
          "-hwaccel_output_format",
          "qsv",
        ];
    const codecArguments = canRemux
      ? ["-c:v", "copy", "-c:a", "copy"]
      : ["-c:v", "h264_qsv", "-global_quality", "23", "-c:a", "aac"];

    if (!canRemux) {
      try {
        await fs.access(configuration.media.qsvDevice, constants.R_OK | constants.W_OK);
      } catch {
        throw new Error(
          `Intel Quick Sync is unavailable at ${configuration.media.qsvDevice}; CPU fallback is disabled`,
        );
      }
    }

    const arguments_ = [
      "-v",
      "error",
      "-y",
      ...hardwareInputArguments,
      "-i",
      source,
      "-map",
      "0:v:0",
      "-map",
      "0:a?",
      ...codecArguments,
      "-f",
      "hls",
      "-hls_time",
      "6",
      "-hls_list_size",
      "0",
      "-hls_playlist_type",
      "event",
      "-hls_flags",
      "independent_segments+temp_file",
      "-hls_segment_filename",
      path.join(outputDirectory, "segment-%05d.ts"),
      "-progress",
      "pipe:1",
      "-nostats",
      playlist,
    ];

    await new Promise<void>((resolve, reject) => {
      const process = spawn(configuration.media.ffmpegPath, arguments_, {
        stdio: ["ignore", "pipe", "pipe"],
      });
      let stderr = "";
      let output = "";
      let lastProgress = 0;
      let progressWrites = Promise.resolve();

      process.stdout.setEncoding("utf8");
      process.stdout.on("data", (chunk: string) => {
        output += chunk;
        const lines = output.split("\n");
        output = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("out_time_us=")) continue;
          const microseconds = Number(line.slice("out_time_us=".length));
          const progress = Math.min(
            99,
            Math.round((microseconds / 1_000_000 / Number(lesson.duration_seconds)) * 100),
          );
          if (progress >= lastProgress + 2) {
            lastProgress = progress;
            progressWrites = progressWrites.then(() => onProgress(progress));
          }
        }
      });
      process.stderr.setEncoding("utf8");
      process.stderr.on("data", (chunk: string) => {
        stderr = `${stderr}${chunk}`.slice(-8_000);
      });
      process.on("error", reject);
      process.on("close", async (code) => {
        await progressWrites;
        if (code === 0) resolve();
        else reject(new Error(stderr.trim() || `FFmpeg exited with code ${code}`));
      });
    });

    return playlist;
  };
}

export function createConversionManager(options: {
  repository: ConversionRepository;
  catalog: CatalogRepository;
  configuration: Configuration;
  logger: Logger;
  executor?: ConversionExecutor;
}): ConversionManager {
  const executor = options.executor ?? createFfmpegConversionExecutor(options.configuration);
  const queue: string[] = [];
  const scheduled = new Set<string>();
  let processing = false;

  function enqueueLesson(lessonId: string): void {
    if (scheduled.has(lessonId)) return;
    scheduled.add(lessonId);
    queue.push(lessonId);
    void processQueue();
  }

  async function processQueue(): Promise<void> {
    if (processing) return;
    processing = true;
    try {
      while (queue.length > 0) {
        const lessonId = queue.shift();
        if (!lessonId) continue;
        const lesson = await options.catalog.findLesson(lessonId);
        if (!lesson) {
          scheduled.delete(lessonId);
          continue;
        }
        await options.repository.markConverting(
          lessonId,
          path.join(options.configuration.media.hlsDirectory, lessonId, "index.m3u8"),
        );
        try {
          const playlist = await executor(lesson, (progress) =>
            options.repository.updateProgress(lessonId, progress),
          );
          await options.repository.markReady(lessonId, playlist);
        } catch (error) {
          const message = error instanceof Error ? error.message : "Conversion failed";
          await options.repository.markFailed(lessonId, message);
          options.logger.error("Video conversion failed", { lessonId, error });
        } finally {
          scheduled.delete(lessonId);
        }
      }
    } finally {
      processing = false;
    }
  }

  async function queueLesson(lesson: LessonRow, force: boolean): Promise<ConversionRecord> {
    const existing = await options.repository.getConversion(lesson.id);
    if (!force && existing) return existing;
    await options.repository.queueConversion(lesson.id);
    enqueueLesson(lesson.id);
    return (await options.repository.getConversion(lesson.id))!;
  }

  return {
    requestConversion: (lesson) => queueLesson(lesson, false),
    retryConversion: (lesson) => queueLesson(lesson, true),
    getConversion: (lessonId) => options.repository.getConversion(lessonId),
    async recoverConversions() {
      for (const lessonId of await options.repository.listPendingLessonIds()) {
        await options.repository.queueConversion(lessonId);
        enqueueLesson(lessonId);
      }
    },
  };
}
