import type { Knex } from "knex";

import type { CatalogSnapshot, LessonRecord } from "./types.js";

export interface CourseOrder {
  id: string;
  sortOrder: number;
}

export interface StoredCourse {
  id: string;
  path: string;
}

export interface CatalogCounts {
  courseCount: number;
  lessonCount: number;
}

export interface CatalogRepository {
  synchronizeCatalog(snapshot: CatalogSnapshot): Promise<void>;
  synchronizeCourses(
    snapshot: CatalogSnapshot,
    courseIds: string[],
    courseOrder: CourseOrder[],
  ): Promise<void>;
  getCourses(): Promise<StoredCourse[]>;
  getLessons(courseIds?: string[]): Promise<LessonRecord[]>;
  getCatalogCounts(): Promise<CatalogCounts>;
}

export function createCatalogRepository(database: Knex): CatalogRepository {
  return {
    async synchronizeCatalog(snapshot) {
      await database.transaction(async (transaction) => {
        await upsertSnapshot(transaction, snapshot);

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

    async synchronizeCourses(snapshot, courseIds, courseOrder) {
      if (courseIds.length === 0) return;
      await database.transaction(async (transaction) => {
        await upsertSnapshot(transaction, snapshot);

        for (const course of courseOrder) {
          await transaction("courses")
            .where({ id: course.id })
            .update({ sort_order: course.sortOrder });
        }

        const retainedLessonIds = [
          ...snapshot.lessons.map((lesson) => lesson.id),
          ...snapshot.skippedLessonIds,
        ];
        const lessons = transaction("lessons").whereIn("course_id", courseIds);
        if (retainedLessonIds.length > 0)
          await lessons.whereNotIn("id", retainedLessonIds).delete();
        else await lessons.delete();

        const retainedSectionIds = snapshot.sections.map((section) => section.id);
        const sections = transaction("sections").whereIn("course_id", courseIds);
        if (retainedSectionIds.length > 0) {
          await sections.whereNotIn("id", retainedSectionIds).delete();
        } else await sections.delete();

        const retainedCourseIds = snapshot.courses.map((course) => course.id);
        const courses = transaction("courses").whereIn("id", courseIds);
        if (retainedCourseIds.length > 0) {
          await courses.whereNotIn("id", retainedCourseIds).delete();
        } else await courses.delete();
      });
    },

    async getCourses() {
      const rows = await database("courses").select("id", "path");
      return rows.map((row) => ({ id: String(row.id), path: String(row.path) }));
    },

    async getLessons(courseIds) {
      const query = database("lessons");
      if (courseIds) {
        if (courseIds.length === 0) return [];
        query.whereIn("course_id", courseIds);
      }
      const rows = await query.select();
      return rows.map((row) => ({
        id: String(row.id),
        courseId: String(row.course_id),
        sectionId: row.section_id === null ? null : String(row.section_id),
        path: String(row.path),
        title: String(row.title),
        sortOrder: Number(row.sort_order),
        durationSeconds: Number(row.duration_seconds),
        sizeBytes: Number(row.size_bytes),
        container: String(row.container),
        videoCodec: String(row.video_codec),
        audioCodec: row.audio_codec === null ? null : String(row.audio_codec),
        browserCompatible: Boolean(row.browser_compatible),
        modifiedAt: String(row.modified_at),
      }));
    },

    async getCatalogCounts() {
      const [courses, lessons] = await Promise.all([
        database("courses").count<{ count: number }[]>({ count: "id" }).first(),
        database("lessons").count<{ count: number }[]>({ count: "id" }).first(),
      ]);
      return {
        courseCount: Number(courses?.count ?? 0),
        lessonCount: Number(lessons?.count ?? 0),
      };
    },
  };
}

async function upsertSnapshot(
  transaction: Knex.Transaction,
  snapshot: CatalogSnapshot,
): Promise<void> {
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
      await transaction("conversions").where({ lesson_id: lesson.id }).delete();
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
