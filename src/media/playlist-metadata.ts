import fs from "node:fs/promises";
import path from "node:path";

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

const playlistMetadataSchema = z
  .object({
    version: z.literal(1),
    title: metadataNameSchema.optional(),
    description: z.string().trim().optional(),
    cover: metadataNameSchema.optional(),
    category: filterNameSchema.optional(),
    authors: metadataNamesSchema.optional(),
    tags: metadataNamesSchema.optional(),
    source: z
      .object({
        provider: filterNameSchema,
        url: z.url(),
      })
      .optional(),
  })
  .strict();

export type PlaylistMetadata = z.infer<typeof playlistMetadataSchema>;

export async function readPlaylistMetadata(playlistDirectory: string): Promise<{
  metadata: PlaylistMetadata | null;
  warning: string | null;
}> {
  try {
    const contents = await fs.readFile(path.join(playlistDirectory, "playlist.json"), "utf8");
    const value: unknown = JSON.parse(contents);
    const result = playlistMetadataSchema.safeParse(value);
    if (!result.success) return { metadata: null, warning: result.error.message };
    return { metadata: result.data, warning: null };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT")
      return { metadata: null, warning: null };
    return {
      metadata: null,
      warning: error instanceof Error ? error.message : "Could not read playlist.json",
    };
  }
}
