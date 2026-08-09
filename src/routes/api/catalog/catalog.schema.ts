import { z } from "zod";

export const identifierSchema = z.string().regex(/^[a-f0-9]{24}$/);

export const catalogQuerySchema = z.object({
  query: z.string().trim().max(200).optional(),
});

export const courseParametersSchema = z.object({
  courseId: identifierSchema,
});

export const lessonParametersSchema = z.object({
  lessonId: identifierSchema,
});

export const lessonResponseSchema = z.object({
  id: identifierSchema,
  courseId: identifierSchema,
  courseTitle: z.string(),
  sectionId: identifierSchema.nullable(),
  sectionTitle: z.string().nullable(),
  title: z.string(),
  durationSeconds: z.number().nonnegative(),
  positionSeconds: z.number().nonnegative(),
  completed: z.boolean(),
  progressPercent: z.number().int().min(0).max(100),
});

export const courseResponseSchema = z.object({
  id: identifierSchema,
  title: z.string(),
  description: z.string(),
  coverUrl: z.string().nullable(),
  lessonCount: z.number().int().nonnegative(),
  completedCount: z.number().int().nonnegative(),
  progressPercent: z.number().int().min(0).max(100),
  durationSeconds: z.number().nonnegative(),
});

export const courseDetailResponseSchema = courseResponseSchema.extend({
  sections: z.array(
    z.object({
      id: identifierSchema.nullable(),
      title: z.string(),
      lessons: z.array(lessonResponseSchema),
    }),
  ),
});

export const catalogResponseSchema = z.object({
  courses: z.array(courseResponseSchema),
  continueWatching: z.array(lessonResponseSchema),
});

export const lessonDetailResponseSchema = z.object({
  lesson: lessonResponseSchema,
  course: courseDetailResponseSchema,
});
