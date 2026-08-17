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
const chapterSchema = z.object({
  title: metadataNameSchema.max(300),
  startSeconds: z.number().int().nonnegative(),
});
const lessonMetadataSchema = z
  .object({
    path: metadataNameSchema
      .max(1_000)
      .refine(
        (value) =>
          !path.posix.isAbsolute(value) &&
          !value.includes("\\") &&
          path.posix.normalize(value) === value,
        "Lesson path must be a normalized relative path",
      ),
    chapters: z.array(chapterSchema).min(1).max(500),
  })
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

const courseMetadataSchema = z.object({
  version: z.literal(1),
  title: metadataNameSchema.optional(),
  description: z.string().trim().optional(),
  cover: metadataNameSchema.optional(),
  category: filterNameSchema.optional(),
  instructors: metadataNamesSchema.optional(),
  tags: metadataNamesSchema.optional(),
  source: z
    .object({
      provider: filterNameSchema,
      url: z.url(),
    })
    .optional(),
});

export type LessonMetadata = z.infer<typeof lessonMetadataSchema>;
export type CourseMetadata = z.infer<typeof courseMetadataSchema> & {
  lessons: LessonMetadata[];
};

export async function readCourseMetadata(courseDirectory: string): Promise<{
  metadata: CourseMetadata | null;
  warning: string | null;
}> {
  try {
    const contents = await fs.readFile(path.join(courseDirectory, "course.json"), "utf8");
    const value: unknown = JSON.parse(contents);
    const result = courseMetadataSchema.safeParse(value);
    if (!result.success) return { metadata: null, warning: result.error.message };

    const rawLessons =
      typeof value === "object" && value !== null && "lessons" in value
        ? (value as { lessons?: unknown }).lessons
        : undefined;
    if (rawLessons === undefined) {
      return { metadata: { ...result.data, lessons: [] }, warning: null };
    }
    if (!Array.isArray(rawLessons)) {
      return {
        metadata: { ...result.data, lessons: [] },
        warning: "lessons: Expected an array",
      };
    }

    const lessons: LessonMetadata[] = [];
    const warnings: string[] = [];
    const paths = new Set<string>();
    for (const [index, lesson] of rawLessons.entries()) {
      const lessonResult = lessonMetadataSchema.safeParse(lesson);
      if (!lessonResult.success) {
        warnings.push(`lessons.${index}: ${lessonResult.error.message}`);
        continue;
      }
      if (paths.has(lessonResult.data.path)) {
        warnings.push(`lessons.${index}: Duplicate lesson path ${lessonResult.data.path}`);
        continue;
      }
      paths.add(lessonResult.data.path);
      lessons.push(lessonResult.data);
    }

    return {
      metadata: { ...result.data, lessons },
      warning: warnings.length > 0 ? warnings.join("\n") : null,
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT")
      return { metadata: null, warning: null };
    return {
      metadata: null,
      warning: error instanceof Error ? error.message : "Could not read course.json",
    };
  }
}
