import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export async function generateCover(
  sourceVideo: string,
  destination: string,
  ffmpegPath: string,
): Promise<void> {
  try {
    if ((await fs.stat(destination)).isFile()) return;
  } catch {
    // Generate the missing cover below.
  }

  await fs.mkdir(path.dirname(destination), { recursive: true });
  await execFileAsync(
    ffmpegPath,
    [
      "-v",
      "error",
      "-ss",
      "3",
      "-i",
      sourceVideo,
      "-frames:v",
      "1",
      "-q:v",
      "3",
      "-y",
      destination,
    ],
    { timeout: 60_000 },
  );
}
