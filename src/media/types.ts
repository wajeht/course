export interface CourseRecord {
  id: string;
  path: string;
  title: string;
  description: string;
  category: string;
  instructors: string[];
  tags: string[];
  coverPath: string | null;
  sortOrder: number;
}

export interface SectionRecord {
  id: string;
  courseId: string;
  path: string;
  title: string;
  sortOrder: number;
}

export interface LessonRecord {
  id: string;
  courseId: string;
  sectionId: string | null;
  path: string;
  title: string;
  sortOrder: number;
  durationSeconds: number;
  sizeBytes: number;
  container: string;
  videoCodec: string;
  audioCodec: string | null;
  browserCompatible: boolean;
  modifiedAt: string;
}

export interface ChapterRecord {
  id: string;
  lessonId: string;
  title: string;
  startSeconds: number;
  sortOrder: number;
}

export interface CatalogSnapshot {
  courses: CourseRecord[];
  sections: SectionRecord[];
  lessons: LessonRecord[];
  chapters: ChapterRecord[];
  skippedLessonIds: string[];
}

export interface ScanWarning {
  path: string;
  message: string;
}

export interface ScanStatus {
  status: "idle" | "scanning" | "complete" | "failed";
  startedAt: string | null;
  completedAt: string | null;
  courseCount: number;
  lessonCount: number;
  warnings: ScanWarning[];
  error: string | null;
}
