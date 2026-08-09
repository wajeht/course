import path from "node:path";

import { z } from "zod";

const environmentSchema = z.object({
  APP_ENV: z.enum(["development", "testing", "production"]).default("development"),
  APP_HOST: z.string().default("0.0.0.0"),
  APP_PORT: z.coerce.number().int().positive().default(80),
  APP_VUE_PORT: z.coerce.number().int().positive().default(3000),
  VIDEOS_DIR: z.string().default("/Volumes/plex/videos"),
  DATA_DIR: z.string().default("data"),
  SCAN_INTERVAL_MS: z.coerce.number().int().min(10_000).default(300_000),
  FFMPEG_PATH: z.string().default("ffmpeg"),
  FFPROBE_PATH: z.string().default("ffprobe"),
  QSV_DEVICE: z.string().default("/dev/dri/renderD128"),
});

export type AppEnvironment = z.infer<typeof environmentSchema>["APP_ENV"];

export interface Configuration {
  app: {
    env: AppEnvironment;
    host: string;
    port: number;
    vuePort: number;
    clientDirectory: string;
  };
  media: {
    videosDirectory: string;
    dataDirectory: string;
    generatedCoversDirectory: string;
    hlsDirectory: string;
    scanIntervalMs: number;
    ffmpegPath: string;
    ffprobePath: string;
    qsvDevice: string;
  };
  database: {
    filename: string;
  };
}

export function createConfiguration(environment: NodeJS.ProcessEnv = process.env): Configuration {
  const parsed = environmentSchema.parse(environment);
  const dataDirectory = path.resolve(parsed.DATA_DIR);
  const videosDirectory = path.resolve(parsed.VIDEOS_DIR);

  return {
    app: {
      env: parsed.APP_ENV,
      host: parsed.APP_HOST,
      port: parsed.APP_PORT,
      vuePort: parsed.APP_VUE_PORT,
      clientDirectory: path.resolve("dist/client"),
    },
    media: {
      videosDirectory,
      dataDirectory,
      generatedCoversDirectory: path.join(dataDirectory, "covers"),
      hlsDirectory: path.join(dataDirectory, "hls"),
      scanIntervalMs: parsed.SCAN_INTERVAL_MS,
      ffmpegPath: parsed.FFMPEG_PATH,
      ffprobePath: parsed.FFPROBE_PATH,
      qsvDevice: parsed.QSV_DEVICE,
    },
    database: {
      filename:
        parsed.APP_ENV === "testing" ? ":memory:" : path.join(dataDirectory, "course.sqlite"),
    },
  };
}

export const configuration = createConfiguration();
