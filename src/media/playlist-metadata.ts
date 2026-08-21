import fs from "node:fs/promises";
import path from "node:path";

import { z } from "zod";

import { metadataNameSchema, metadataNamesSchema, sourceMetadataSchema } from "./metadata.js";

const playlistMetadataSchema = z
  .object({
    version: z.literal(1),
    title: metadataNameSchema.optional(),
    description: z.string().trim().optional(),
    cover: metadataNameSchema.optional(),
    authors: metadataNamesSchema.optional(),
    tags: metadataNamesSchema.optional(),
    source: sourceMetadataSchema.optional(),
  })
  .strict();

export type PlaylistMetadata = z.infer<typeof playlistMetadataSchema>;

export async function readPlaylistMetadata(playlistDirectory: string): Promise<{
  metadata: PlaylistMetadata | null;
  warning: string | null;
}> {
  try {
    const contents = await fs.readFile(path.join(playlistDirectory, "playlist.json"), "utf8");
    const result = playlistMetadataSchema.safeParse(JSON.parse(contents) as unknown);
    return result.success
      ? { metadata: result.data, warning: null }
      : { metadata: null, warning: result.error.message };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { metadata: null, warning: null };
    }
    return {
      metadata: null,
      warning: error instanceof Error ? error.message : "Could not read playlist.json",
    };
  }
}
