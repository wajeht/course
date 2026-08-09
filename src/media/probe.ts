import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export const videoExtensions = new Set([
  ".mp4",
  ".m4v",
  ".mkv",
  ".webm",
  ".mov",
  ".avi",
  ".mpeg",
  ".mpg",
]);

interface ProbeStream {
  codec_type?: string;
  codec_name?: string;
  duration?: string;
}

interface ProbeOutput {
  streams?: ProbeStream[];
  format?: {
    duration?: string;
    format_name?: string;
    size?: string;
  };
}

export interface VideoProbe {
  durationSeconds: number;
  sizeBytes: number;
  container: string;
  videoCodec: string;
  audioCodec: string | null;
  browserCompatible: boolean;
}

function isBrowserCompatible(
  container: string,
  videoCodec: string,
  audioCodec: string | null,
): boolean {
  const mp4Container = ["mp4", "m4v", "mov"].includes(container);
  const mp4Codecs =
    videoCodec === "h264" && (audioCodec === null || ["aac", "mp3"].includes(audioCodec));
  const webmContainer = container === "webm";
  const webmCodecs =
    ["vp8", "vp9", "av1"].includes(videoCodec) &&
    (audioCodec === null || ["opus", "vorbis"].includes(audioCodec));
  return (mp4Container && mp4Codecs) || (webmContainer && webmCodecs);
}

export async function probeVideo(filename: string, ffprobePath: string): Promise<VideoProbe> {
  const { stdout } = await execFileAsync(
    ffprobePath,
    ["-v", "error", "-show_format", "-show_streams", "-of", "json", filename],
    { encoding: "utf8", maxBuffer: 5 * 1024 * 1024, timeout: 30_000 },
  );
  const output = JSON.parse(stdout) as ProbeOutput;
  const videoStream = output.streams?.find((stream) => stream.codec_type === "video");
  const audioStream = output.streams?.find((stream) => stream.codec_type === "audio");
  const durationSeconds = Number(output.format?.duration ?? videoStream?.duration);
  const sizeBytes = Number(output.format?.size);
  const videoCodec = videoStream?.codec_name;
  const audioCodec = audioStream?.codec_name ?? null;
  const container = path.extname(filename).slice(1).toLowerCase();

  if (
    !videoCodec ||
    !Number.isFinite(durationSeconds) ||
    durationSeconds <= 0 ||
    !Number.isFinite(sizeBytes)
  ) {
    throw new Error("FFprobe did not return a valid video stream, duration, and size");
  }

  return {
    durationSeconds,
    sizeBytes,
    container,
    videoCodec,
    audioCodec,
    browserCompatible: isBrowserCompatible(container, videoCodec, audioCodec),
  };
}
