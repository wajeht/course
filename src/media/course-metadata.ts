import fs from "node:fs/promises";
import path from "node:path";

import { z } from "zod";

const courseMetadataSchema = z.object({
  version: z.literal(1),
  title: z.string().trim().min(1).optional(),
  description: z.string().trim().optional(),
  cover: z.string().trim().min(1).optional(),
});

export type CourseMetadata = z.infer<typeof courseMetadataSchema>;

export async function readCourseMetadata(courseDirectory: string): Promise<{
  metadata: CourseMetadata | null;
  warning: string | null;
}> {
  try {
    const contents = await fs.readFile(path.join(courseDirectory, "course.json"), "utf8");
    const result = courseMetadataSchema.safeParse(JSON.parse(contents));
    if (!result.success) return { metadata: null, warning: result.error.message };
    return { metadata: result.data, warning: null };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT")
      return { metadata: null, warning: null };
    return {
      metadata: null,
      warning: error instanceof Error ? error.message : "Could not read course.json",
    };
  }
}
