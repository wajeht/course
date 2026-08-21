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
  author?: string[];
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
  "videos.id",
  "videos.course_id",
  "playlists.title as course_title",
  "playlists.cover_path as course_cover_path",
  "videos.section_id",
  "sections.title as section_title",
  "videos.title",
  "videos.path",
  "videos.duration_seconds",
  "videos.browser_compatible",
  "videos.video_codec",
  "videos.audio_codec",
  "videos.container",
  "progress.position_seconds",
  "progress.completed",
  "progress.updated_at as progress_updated_at",
  "videos.sort_order",
  "sections.sort_order as section_sort_order",
];

export function createCatalogApiRepository(database: Knex): CatalogRepository {
  function createLessonsQuery() {
    return database<LessonRow>("videos")
      .join("playlists", "playlists.id", "videos.course_id")
      .leftJoin("sections", "sections.id", "videos.section_id")
      .leftJoin("progress", "progress.lesson_id", "videos.id")
      .select(lessonSelect);
  }

  function createCourseQuery() {
    return database<CourseRow>("playlists")
      .leftJoin("videos", "videos.course_id", "playlists.id")
      .leftJoin("progress", "progress.lesson_id", "videos.id")
      .select(
        "playlists.id",
        "playlists.title",
        "playlists.description",
        "playlists.category",
        "playlists.instructors_json",
        "playlists.tags_json",
        "playlists.cover_path",
        database.raw("COUNT(DISTINCT videos.id) as lesson_count"),
        database.raw(
          "COUNT(DISTINCT CASE WHEN progress.completed = 1 THEN videos.id END) as completed_count",
        ),
        database.raw("COALESCE(SUM(videos.duration_seconds), 0) as total_duration"),
      )
      .groupBy("playlists.id");
  }

  function applyCourseFilters(
    queryBuilder: Knex.QueryBuilder,
    { query, category, author, tag }: CourseFilters = {},
  ): void {
    if (category?.length) queryBuilder.whereIn("playlists.category", category);
    if (author?.length) {
      const placeholders = author.map(() => "?").join(", ");
      queryBuilder.whereRaw(
        `EXISTS (SELECT 1 FROM json_each(playlists.instructors_json) WHERE value COLLATE NOCASE IN (${placeholders}))`,
        author,
      );
    }
    if (tag?.length) {
      const placeholders = tag.map(() => "?").join(", ");
      queryBuilder.whereRaw(
        `EXISTS (SELECT 1 FROM json_each(playlists.tags_json) WHERE value COLLATE NOCASE IN (${placeholders}))`,
        tag,
      );
    }
    if (query) {
      const search = `%${query}%`;
      queryBuilder.where((where) => {
        where
          .whereLike("playlists.title", search)
          .orWhereLike("playlists.description", search)
          .orWhereLike("playlists.category", search)
          .orWhereLike("playlists.instructors_json", search)
          .orWhereLike("playlists.tags_json", search)
          .orWhereExists(
            database("videos as matching_lessons")
              .select(database.raw("1"))
              .whereRaw("matching_lessons.course_id = playlists.id")
              .whereLike("matching_lessons.title", search),
          );
      });
    }
  }

  return {
    async listCourses(filters = {}, pagination) {
      const queryBuilder = createCourseQuery().orderBy("playlists.sort_order");
      applyCourseFilters(queryBuilder, filters);
      if (pagination) queryBuilder.limit(pagination.limit).offset(pagination.offset);
      return queryBuilder;
    },

    async countCourses(filters = {}) {
      const queryBuilder = database("playlists")
        .countDistinct({ course_count: "playlists.id" })
        .first();
      applyCourseFilters(queryBuilder, filters);
      const row = (await queryBuilder) as { course_count?: number | string } | undefined;
      return Number(row?.course_count ?? 0);
    },

    async listCategories(filters = {}) {
      const queryBuilder = database<CourseCountRow>("playlists")
        .select("category as name")
        .countDistinct("playlists.id as course_count")
        .groupBy("category")
        .orderByRaw("category COLLATE NOCASE");
      applyCourseFilters(queryBuilder, filters);
      return (await queryBuilder) as unknown as CourseCountRow[];
    },

    async listInstructors(filters = {}) {
      const queryBuilder = database<CourseCountRow>("playlists")
        .joinRaw("JOIN json_each(playlists.instructors_json) AS author")
        .select(database.raw("MIN(author.value) as name"))
        .countDistinct("playlists.id as course_count")
        .groupByRaw("author.value COLLATE NOCASE")
        .orderByRaw("name COLLATE NOCASE");
      applyCourseFilters(queryBuilder, filters);
      return (await queryBuilder) as unknown as CourseCountRow[];
    },

    async listTags(filters = {}) {
      const queryBuilder = database<CourseCountRow>("playlists")
        .joinRaw("JOIN json_each(playlists.tags_json) AS tag")
        .select(database.raw("MIN(tag.value) as name"))
        .countDistinct("playlists.id as course_count")
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
            JOIN videos AS recent_lessons ON recent_lessons.id = recent_progress.lesson_id
            WHERE recent_lessons.course_id = videos.course_id
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
      return createCourseQuery().where("playlists.id", courseId).first();
    },

    listCourseLessons(courseId) {
      return createLessonsQuery()
        .where("videos.course_id", courseId)
        .orderByRaw("videos.section_id IS NOT NULL")
        .orderBy("sections.sort_order")
        .orderBy("videos.sort_order");
    },

    findLesson(lessonId) {
      return createLessonsQuery().where("videos.id", lessonId).first();
    },

    listLessonChapters(lessonId) {
      return database<ChapterRow>("chapters")
        .where({ lesson_id: lessonId })
        .orderBy("sort_order")
        .select("id", "lesson_id", "title", "start_seconds", "sort_order");
    },
  };
}
