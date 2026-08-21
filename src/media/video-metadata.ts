import fs from "node:fs/promises";

import { z } from "zod";

import { metadataNameSchema, metadataNamesSchema, sourceMetadataSchema } from "./metadata.js";

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
    authors: metadataNamesSchema.optional(),
    tags: metadataNamesSchema.optional(),
    source: sourceMetadataSchema.optional(),
    chapters: z.array(chapterSchema).max(500).optional(),
  })
  .strict()
  .superRefine(({ chapters = [] }, context) => {
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
