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

const courseMetadataSchema = z.object({
  version: z.literal(1),
  title: metadataNameSchema.optional(),
  description: z.string().trim().optional(),
  cover: metadataNameSchema.optional(),
  category: filterNameSchema.optional(),
  instructors: metadataNamesSchema.optional(),
  tags: metadataNamesSchema.optional(),
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
    if (error instanceof Error && "code" in error && error.code === "ENOENT")
      return { metadata: null, warning: null };
    return {
      metadata: null,
      warning: error instanceof Error ? error.message : "Could not read course.json",
    };
  }
}
