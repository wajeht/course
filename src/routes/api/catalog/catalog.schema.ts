import { z } from "zod";

export const identifierSchema = z.string().regex(/^[a-f0-9]{24}$/);

export const catalogQuerySchema = z.object({
  query: z.string().trim().max(200).optional(),
  category: z.string().trim().min(1).max(200).optional(),
  instructor: z.string().trim().min(1).max(200).optional(),
  tag: z.string().trim().min(1).max(200).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
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
  courseCoverUrl: z.string().nullable(),
  sectionId: identifierSchema.nullable(),
  sectionTitle: z.string().nullable(),
  title: z.string(),
  durationSeconds: z.number().nonnegative(),
  positionSeconds: z.number().nonnegative(),
  completed: z.boolean(),
  progressPercent: z.number().int().min(0).max(100),
});

export const chapterResponseSchema = z.object({
  title: z.string(),
  startSeconds: z.number().int().nonnegative(),
});

export const lessonWithChaptersResponseSchema = lessonResponseSchema.extend({
  chapters: z.array(chapterResponseSchema),
});

export const courseResponseSchema = z.object({
  id: identifierSchema,
  title: z.string(),
  description: z.string(),
  category: z.string(),
  instructors: z.array(z.string()),
  tags: z.array(z.string()),
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
  categories: z.array(
    z.object({
      name: z.string(),
      courseCount: z.number().int().nonnegative(),
    }),
  ),
  instructors: z.array(
    z.object({
      name: z.string(),
      courseCount: z.number().int().nonnegative(),
    }),
  ),
  tags: z.array(
    z.object({
      name: z.string(),
      courseCount: z.number().int().nonnegative(),
    }),
  ),
  continueWatching: z.array(lessonResponseSchema),
  pagination: z.object({
    page: z.number().int().min(1),
    pageSize: z.number().int().min(1).max(100),
    totalCourses: z.number().int().nonnegative(),
    totalPages: z.number().int().nonnegative(),
  }),
});

export const lessonDetailResponseSchema = z.object({
  lesson: lessonWithChaptersResponseSchema,
  course: courseDetailResponseSchema,
});
