import fs from "node:fs/promises";

import { z } from "zod";

function uniqueValues(values: string[]): string[] {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = value.toLocaleLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const metadataNameSchema = z.string().trim().min(1);
const filterNameSchema = metadataNameSchema.max(200);
const metadataNamesSchema = z.array(filterNameSchema).max(50).transform(uniqueValues);

const chapterSchema = z
  .object({
    title: z.string().trim().min(1).max(300),
    startSeconds: z.number().int().nonnegative(),
  })
  .strict();

const videoMetadataSchema = z
  .object({
    version: z.literal(1),
    title: metadataNameSchema.optional(),
    description: z.string().trim().optional(),
    cover: metadataNameSchema.optional(),
    category: filterNameSchema.optional(),
    authors: metadataNamesSchema.optional(),
    tags: metadataNamesSchema.optional(),
    chapters: z.array(chapterSchema).max(500).default([]),
  })
  .strict()
  .superRefine(({ chapters }, context) => {
    for (let index = 1; index < chapters.length; index += 1) {
      if (chapters[index]!.startSeconds <= chapters[index - 1]!.startSeconds) {
        context.addIssue({
          code: "custom",
          path: ["chapters", index, "startSeconds"],
          message: "Chapter start times must be strictly increasing",
        });
      }
    }
  });

export type VideoMetadata = z.infer<typeof videoMetadataSchema>;

export async function readVideoMetadata(videoFilename: string): Promise<{
  metadata: VideoMetadata | null;
  warning: string | null;
}> {
  const sidecarFilename = `${videoFilename}.json`;
  try {
    const contents = await fs.readFile(sidecarFilename, "utf8");
    const result = videoMetadataSchema.safeParse(JSON.parse(contents) as unknown);
    return result.success
      ? { metadata: result.data, warning: null }
      : { metadata: null, warning: result.error.message };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { metadata: null, warning: null };
    }
    return {
      metadata: null,
      warning: error instanceof Error ? error.message : "Could not read video metadata",
    };
  }
}
