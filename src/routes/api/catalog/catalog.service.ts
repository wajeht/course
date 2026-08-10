import type {
  CatalogRepository,
  CourseCountRow,
  CourseFilters,
  CourseRow,
  LessonRow,
} from "./catalog.repository.js";

export interface LessonDto {
  id: string;
  courseId: string;
  courseTitle: string;
  courseCoverUrl: string | null;
  sectionId: string | null;
  sectionTitle: string | null;
  title: string;
  durationSeconds: number;
  positionSeconds: number;
  completed: boolean;
  progressPercent: number;
}

export interface CourseDto {
  id: string;
  title: string;
  description: string;
  category: string;
  instructors: string[];
  tags: string[];
  coverUrl: string | null;
  lessonCount: number;
  completedCount: number;
  progressPercent: number;
  durationSeconds: number;
}

export interface CatalogFilterDto {
  name: string;
  courseCount: number;
}

export type CatalogFilters = CourseFilters;

export interface CourseDetailDto extends CourseDto {
  sections: Array<{
    id: string | null;
    title: string;
    lessons: LessonDto[];
  }>;
}

export interface CatalogService {
  getCatalog(filters?: CatalogFilters): Promise<{
    courses: CourseDto[];
    categories: CatalogFilterDto[];
    instructors: CatalogFilterDto[];
    tags: CatalogFilterDto[];
    continueWatching: LessonDto[];
  }>;
  getCourse(courseId: string): Promise<CourseDetailDto | null>;
  getLesson(lessonId: string): Promise<{ lesson: LessonDto; course: CourseDetailDto } | null>;
  findLessonRecord(lessonId: string): Promise<LessonRow | undefined>;
}

function stringList(value: string): string[] {
  return JSON.parse(value) as string[];
}

function progressPercent(completed: number, total: number): number {
  return total === 0 ? 0 : Math.round((completed / total) * 100);
}

function courseDto(row: CourseRow): CourseDto {
  const lessonCount = Number(row.lesson_count);
  const completedCount = Number(row.completed_count);
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    instructors: stringList(row.instructors_json),
    tags: stringList(row.tags_json),
    coverUrl: row.cover_path ? `/covers/${row.id}` : null,
    lessonCount,
    completedCount,
    progressPercent: progressPercent(completedCount, lessonCount),
    durationSeconds: Number(row.total_duration),
  };
}

function catalogFilterDto(row: CourseCountRow): CatalogFilterDto {
  return { name: row.name, courseCount: Number(row.course_count) };
}

function lessonDto(row: LessonRow): LessonDto {
  const position = row.completed ? Number(row.duration_seconds) : Number(row.position_seconds ?? 0);
  return {
    id: row.id,
    courseId: row.course_id,
    courseTitle: row.course_title,
    courseCoverUrl: row.course_cover_path ? `/covers/${row.course_id}` : null,
    sectionId: row.section_id,
    sectionTitle: row.section_title,
    title: row.title,
    durationSeconds: Number(row.duration_seconds),
    positionSeconds: position,
    completed: Boolean(row.completed),
    progressPercent: Math.min(100, Math.round((position / Number(row.duration_seconds)) * 100)),
  };
}

export function createCatalogService(repository: CatalogRepository): CatalogService {
  async function getCourse(courseId: string): Promise<CourseDetailDto | null> {
    const [courseRow, lessonRows] = await Promise.all([
      repository.findCourse(courseId),
      repository.listCourseLessons(courseId),
    ]);
    if (!courseRow) return null;

    const sectionMap = new Map<string, CourseDetailDto["sections"][number]>();
    for (const row of lessonRows) {
      const key = row.section_id ?? "__direct";
      const section = sectionMap.get(key) ?? {
        id: row.section_id,
        title: row.section_title ?? "Course lessons",
        lessons: [],
      };
      section.lessons.push(lessonDto(row));
      sectionMap.set(key, section);
    }
    return { ...courseDto(courseRow), sections: [...sectionMap.values()] };
  }

  return {
    async getCatalog(filters) {
      const [courses, categories, instructors, tags, continuing] = await Promise.all([
        repository.listCourses(filters),
        repository.listCategories(),
        repository.listInstructors(),
        repository.listTags(),
        repository.listContinueWatching(),
      ]);
      return {
        courses: courses.map(courseDto),
        categories: categories.map(catalogFilterDto),
        instructors: instructors.map(catalogFilterDto),
        tags: tags.map(catalogFilterDto),
        continueWatching: continuing.map(lessonDto),
      };
    },
    getCourse,
    async getLesson(lessonId) {
      const row = await repository.findLesson(lessonId);
      if (!row) return null;
      const courseDetail = await getCourse(row.course_id);
      if (!courseDetail) return null;
      return { lesson: lessonDto(row), course: courseDetail };
    },
    findLessonRecord: (lessonId) => repository.findLesson(lessonId),
  };
}
