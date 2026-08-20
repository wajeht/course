import type { Knex } from "knex";

export interface CourseRow {
  id: string;
  title: string;
  description: string;
  category: string;
  instructors_json: string;
  tags_json: string;
  cover_path: string | null;
  lesson_count: number;
  completed_count: number;
  total_duration: number;
}

export interface CourseCountRow {
  name: string;
  course_count: number;
}

export interface CourseFilters {
  query?: string;
  category?: string[];
  instructor?: string[];
  tag?: string[];
}

export interface CoursePagination {
  limit: number;
  offset: number;
}

export interface LessonRow {
  id: string;
  course_id: string;
  course_title: string;
  course_cover_path: string | null;
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

export interface ChapterRow {
  id: string;
  lesson_id: string;
  title: string;
  start_seconds: number;
  sort_order: number;
}

export interface CatalogRepository {
  listCourses(filters?: CourseFilters, pagination?: CoursePagination): Promise<CourseRow[]>;
  countCourses(filters?: CourseFilters): Promise<number>;
  listCategories(filters?: CourseFilters): Promise<CourseCountRow[]>;
  listInstructors(filters?: CourseFilters): Promise<CourseCountRow[]>;
  listTags(filters?: CourseFilters): Promise<CourseCountRow[]>;
  listContinueWatching(): Promise<LessonRow[]>;
  findCourse(courseId: string): Promise<CourseRow | undefined>;
  listCourseLessons(courseId: string): Promise<LessonRow[]>;
  findLesson(lessonId: string): Promise<LessonRow | undefined>;
  listLessonChapters(lessonId: string): Promise<ChapterRow[]>;
}

const lessonSelect = [
  "lessons.id",
  "lessons.course_id",
  "courses.title as course_title",
  "courses.cover_path as course_cover_path",
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
  function createLessonsQuery() {
    return database<LessonRow>("lessons")
      .join("courses", "courses.id", "lessons.course_id")
      .leftJoin("sections", "sections.id", "lessons.section_id")
      .leftJoin("progress", "progress.lesson_id", "lessons.id")
      .select(lessonSelect);
  }

  function createCourseQuery() {
    return database<CourseRow>("courses")
      .leftJoin("lessons", "lessons.course_id", "courses.id")
      .leftJoin("progress", "progress.lesson_id", "lessons.id")
      .select(
        "courses.id",
        "courses.title",
        "courses.description",
        "courses.category",
        "courses.instructors_json",
        "courses.tags_json",
        "courses.cover_path",
        database.raw("COUNT(DISTINCT lessons.id) as lesson_count"),
        database.raw(
          "COUNT(DISTINCT CASE WHEN progress.completed = 1 THEN lessons.id END) as completed_count",
        ),
        database.raw("COALESCE(SUM(lessons.duration_seconds), 0) as total_duration"),
      )
      .groupBy("courses.id");
  }

  function applyCourseFilters(
    queryBuilder: Knex.QueryBuilder,
    { query, category, instructor, tag }: CourseFilters = {},
  ): void {
    if (category?.length) queryBuilder.whereIn("courses.category", category);
    if (instructor?.length) {
      const placeholders = instructor.map(() => "?").join(", ");
      queryBuilder.whereRaw(
        `EXISTS (SELECT 1 FROM json_each(courses.instructors_json) WHERE value COLLATE NOCASE IN (${placeholders}))`,
        instructor,
      );
    }
    if (tag?.length) {
      const placeholders = tag.map(() => "?").join(", ");
      queryBuilder.whereRaw(
        `EXISTS (SELECT 1 FROM json_each(courses.tags_json) WHERE value COLLATE NOCASE IN (${placeholders}))`,
        tag,
      );
    }
    if (query) {
      const search = `%${query}%`;
      queryBuilder.where((where) => {
        where
          .whereLike("courses.title", search)
          .orWhereLike("courses.description", search)
          .orWhereLike("courses.category", search)
          .orWhereLike("courses.instructors_json", search)
          .orWhereLike("courses.tags_json", search)
          .orWhereExists(
            database("lessons as matching_lessons")
              .select(database.raw("1"))
              .whereRaw("matching_lessons.course_id = courses.id")
              .whereLike("matching_lessons.title", search),
          );
      });
    }
  }

  return {
    async listCourses(filters = {}, pagination) {
      const queryBuilder = createCourseQuery().orderBy("courses.sort_order");
      applyCourseFilters(queryBuilder, filters);
      if (pagination) queryBuilder.limit(pagination.limit).offset(pagination.offset);
      return queryBuilder;
    },

    async countCourses(filters = {}) {
      const queryBuilder = database("courses")
        .countDistinct({ course_count: "courses.id" })
        .first();
      applyCourseFilters(queryBuilder, filters);
      const row = (await queryBuilder) as { course_count?: number | string } | undefined;
      return Number(row?.course_count ?? 0);
    },

    async listCategories(filters = {}) {
      const queryBuilder = database<CourseCountRow>("courses")
        .select("category as name")
        .countDistinct("courses.id as course_count")
        .groupBy("category")
        .orderByRaw("category COLLATE NOCASE");
      applyCourseFilters(queryBuilder, filters);
      return (await queryBuilder) as unknown as CourseCountRow[];
    },

    async listInstructors(filters = {}) {
      const queryBuilder = database<CourseCountRow>("courses")
        .joinRaw("JOIN json_each(courses.instructors_json) AS instructor")
        .select(database.raw("MIN(instructor.value) as name"))
        .countDistinct("courses.id as course_count")
        .groupByRaw("instructor.value COLLATE NOCASE")
        .orderByRaw("name COLLATE NOCASE");
      applyCourseFilters(queryBuilder, filters);
      return (await queryBuilder) as unknown as CourseCountRow[];
    },

    async listTags(filters = {}) {
      const queryBuilder = database<CourseCountRow>("courses")
        .joinRaw("JOIN json_each(courses.tags_json) AS tag")
        .select(database.raw("MIN(tag.value) as name"))
        .countDistinct("courses.id as course_count")
        .groupByRaw("tag.value COLLATE NOCASE")
        .orderByRaw("name COLLATE NOCASE");
      applyCourseFilters(queryBuilder, filters);
      return (await queryBuilder) as unknown as CourseCountRow[];
    },

    listContinueWatching() {
      return createLessonsQuery()
        .where("progress.position_seconds", ">", 0)
        .where("progress.completed", false)
        .whereRaw(`
          progress.lesson_id = (
            SELECT recent_progress.lesson_id
            FROM progress AS recent_progress
            JOIN lessons AS recent_lessons ON recent_lessons.id = recent_progress.lesson_id
            WHERE recent_lessons.course_id = lessons.course_id
              AND recent_progress.position_seconds > 0
              AND recent_progress.completed = 0
            ORDER BY recent_progress.updated_at DESC, recent_progress.lesson_id DESC
            LIMIT 1
          )
        `)
        .orderBy("progress.updated_at", "desc")
        .limit(12);
    },

    findCourse(courseId) {
      return createCourseQuery().where("courses.id", courseId).first();
    },

    listCourseLessons(courseId) {
      return createLessonsQuery()
        .where("lessons.course_id", courseId)
        .orderByRaw("lessons.section_id IS NOT NULL")
        .orderBy("sections.sort_order")
        .orderBy("lessons.sort_order");
    },

    findLesson(lessonId) {
      return createLessonsQuery().where("lessons.id", lessonId).first();
    },

    listLessonChapters(lessonId) {
      return database<ChapterRow>("chapters")
        .where({ lesson_id: lessonId })
        .orderBy("sort_order")
        .select("id", "lesson_id", "title", "start_seconds", "sort_order");
    },
  };
}
