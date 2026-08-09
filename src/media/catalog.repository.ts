import type { Knex } from "knex";

import type { CatalogSnapshot, ScanStatus } from "./types.js";

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
      const row = await database("scan_state").where({ id: 1 }).first();
      return {
        status: row.status as ScanStatus["status"],
        startedAt: row.started_at as string | null,
        completedAt: row.completed_at as string | null,
        courseCount: Number(row.course_count),
        lessonCount: Number(row.lesson_count),
        warnings: JSON.parse(String(row.warnings_json)) as ScanStatus["warnings"],
        error: row.error as string | null,
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
