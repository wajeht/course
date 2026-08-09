import type { Knex } from "knex";

export interface CourseRow {
  id: string;
  title: string;
  description: string;
  cover_path: string | null;
  cover_origin: "videos" | "data" | null;
  lesson_count: number;
  completed_count: number;
  total_duration: number;
}

export interface LessonRow {
  id: string;
  course_id: string;
  course_title: string;
  section_id: string | null;
  section_title: string | null;
  title: string;
  path: string;
  duration_seconds: number;
  browser_compatible: number;
  video_codec: string;
  audio_codec: string | null;
  container: string;
  position_seconds: number | null;
  completed: number | null;
  progress_updated_at: string | null;
  sort_order: number;
  section_sort_order: number | null;
}

export interface CatalogRepository {
  listCourses(query?: string): Promise<CourseRow[]>;
  continueWatching(): Promise<LessonRow[]>;
  findCourse(courseId: string): Promise<CourseRow | undefined>;
  listCourseLessons(courseId: string): Promise<LessonRow[]>;
  findLesson(lessonId: string): Promise<LessonRow | undefined>;
}

const lessonSelect = [
  "lessons.id",
  "lessons.course_id",
  "courses.title as course_title",
  "lessons.section_id",
  "sections.title as section_title",
  "lessons.title",
  "lessons.path",
  "lessons.duration_seconds",
  "lessons.browser_compatible",
  "lessons.video_codec",
  "lessons.audio_codec",
  "lessons.container",
  "progress.position_seconds",
  "progress.completed",
  "progress.updated_at as progress_updated_at",
  "lessons.sort_order",
  "sections.sort_order as section_sort_order",
];

export function createCatalogApiRepository(database: Knex): CatalogRepository {
  function lessonsQuery() {
    return database<LessonRow>("lessons")
      .join("courses", "courses.id", "lessons.course_id")
      .leftJoin("sections", "sections.id", "lessons.section_id")
      .leftJoin("progress", "progress.lesson_id", "lessons.id")
      .select(lessonSelect);
  }

  function courseQuery() {
    return database<CourseRow>("courses")
      .leftJoin("lessons", "lessons.course_id", "courses.id")
      .leftJoin("progress", "progress.lesson_id", "lessons.id")
      .select(
        "courses.id",
        "courses.title",
        "courses.description",
        "courses.cover_path",
        "courses.cover_origin",
        database.raw("COUNT(DISTINCT lessons.id) as lesson_count"),
        database.raw(
          "COUNT(DISTINCT CASE WHEN progress.completed = 1 THEN lessons.id END) as completed_count",
        ),
        database.raw("COALESCE(SUM(lessons.duration_seconds), 0) as total_duration"),
      )
      .groupBy("courses.id");
  }

  return {
    async listCourses(query) {
      const builder = courseQuery().orderBy("courses.sort_order");
      if (query) {
        const search = `%${query}%`;
        builder.where((where) => {
          where
            .whereLike("courses.title", search)
            .orWhereLike("courses.description", search)
            .orWhereExists(
              database("lessons as matching_lessons")
                .select(database.raw("1"))
                .whereRaw("matching_lessons.course_id = courses.id")
                .whereLike("matching_lessons.title", search),
            );
        });
      }
      return builder;
    },

    continueWatching() {
      return lessonsQuery()
        .where("progress.position_seconds", ">", 0)
        .where("progress.completed", false)
        .orderBy("progress.updated_at", "desc")
        .limit(12);
    },

    findCourse(courseId) {
      return courseQuery().where("courses.id", courseId).first();
    },

    listCourseLessons(courseId) {
      return lessonsQuery()
        .where("lessons.course_id", courseId)
        .orderByRaw("lessons.section_id IS NOT NULL")
        .orderBy("sections.sort_order")
        .orderBy("lessons.sort_order");
    },

    findLesson(lessonId) {
      return lessonsQuery().where("lessons.id", lessonId).first();
    },
  };
}
