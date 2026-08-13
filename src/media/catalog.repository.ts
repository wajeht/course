import type { Knex } from "knex";
import { z } from "zod";

import type { CatalogSnapshot, ScanStatus } from "./types.js";

const scanStatusRowSchema = z.object({
  status: z.enum(["idle", "scanning", "complete", "failed"]),
  started_at: z.string().nullable(),
  completed_at: z.string().nullable(),
  course_count: z.coerce.number(),
  lesson_count: z.coerce.number(),
  warnings_json: z.string(),
  error: z.string().nullable(),
});

const scanWarningsSchema = z.array(z.object({ path: z.string(), message: z.string() }));

export interface CatalogRepository {
  synchronizeCatalog(snapshot: CatalogSnapshot): Promise<void>;
  updateScanStatus(status: ScanStatus): Promise<void>;
  getScanStatus(): Promise<ScanStatus>;
}

export function createCatalogRepository(database: Knex): CatalogRepository {
  return {
    async synchronizeCatalog(snapshot) {
      const now = new Date().toISOString();
      await database.transaction(async (transaction) => {
        for (const course of snapshot.courses) {
          await transaction("courses")
            .insert({
              id: course.id,
              path: course.path,
              title: course.title,
              description: course.description,
              category: course.category,
              instructors_json: JSON.stringify(course.instructors),
              tags_json: JSON.stringify(course.tags),
              cover_path: course.coverPath,
              cover_origin: course.coverOrigin,
              sort_order: course.sortOrder,
              created_at: now,
              updated_at: now,
            })
            .onConflict("id")
            .merge({
              path: course.path,
              title: course.title,
              description: course.description,
              category: course.category,
              instructors_json: JSON.stringify(course.instructors),
              tags_json: JSON.stringify(course.tags),
              cover_path: course.coverPath,
              cover_origin: course.coverOrigin,
              sort_order: course.sortOrder,
              updated_at: now,
            });
        }

        for (const section of snapshot.sections) {
          await transaction("sections")
            .insert({
              id: section.id,
              course_id: section.courseId,
              path: section.path,
              title: section.title,
              sort_order: section.sortOrder,
            })
            .onConflict("id")
            .merge();
        }

        for (const lesson of snapshot.lessons) {
          const existingLesson = await transaction("lessons")
            .where({ id: lesson.id })
            .select("modified_at", "size_bytes")
            .first();
          if (
            existingLesson &&
            (existingLesson.modified_at !== lesson.modifiedAt ||
              Number(existingLesson.size_bytes) !== lesson.sizeBytes)
          ) {
            await transaction("conversion_jobs").where({ lesson_id: lesson.id }).delete();
          }
          await transaction("lessons")
            .insert({
              id: lesson.id,
              course_id: lesson.courseId,
              section_id: lesson.sectionId,
              path: lesson.path,
              title: lesson.title,
              sort_order: lesson.sortOrder,
              duration_seconds: lesson.durationSeconds,
              size_bytes: lesson.sizeBytes,
              container: lesson.container,
              video_codec: lesson.videoCodec,
              audio_codec: lesson.audioCodec,
              browser_compatible: lesson.browserCompatible,
              modified_at: lesson.modifiedAt,
            })
            .onConflict("id")
            .merge();
        }

        await deleteMissing(transaction, "lessons", [
          ...snapshot.lessons.map((item) => item.id),
          ...snapshot.skippedLessonIds,
        ]);
        await deleteMissing(
          transaction,
          "sections",
          snapshot.sections.map((item) => item.id),
        );
        await deleteMissing(
          transaction,
          "courses",
          snapshot.courses.map((item) => item.id),
        );
      });
    },

    async updateScanStatus(status) {
      await database("scan_state")
        .where({ id: 1 })
        .update({
          status: status.status,
          started_at: status.startedAt,
          completed_at: status.completedAt,
          course_count: status.courseCount,
          lesson_count: status.lessonCount,
          warnings_json: JSON.stringify(status.warnings),
          error: status.error,
        });
    },

    async getScanStatus() {
      const row = scanStatusRowSchema.parse(await database("scan_state").where({ id: 1 }).first());
      return {
        status: row.status,
        startedAt: row.started_at,
        completedAt: row.completed_at,
        courseCount: row.course_count,
        lessonCount: row.lesson_count,
        warnings: scanWarningsSchema.parse(JSON.parse(row.warnings_json)),
        error: row.error,
      };
    },
  };
}

async function deleteMissing(
  transaction: Knex.Transaction,
  table: "courses" | "sections" | "lessons",
  ids: string[],
): Promise<void> {
  const query = transaction(table);
  if (ids.length > 0) await query.whereNotIn("id", ids).delete();
  else await query.delete();
}
