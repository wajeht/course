import { createHash } from "node:crypto";
import { watch } from "node:fs";
import type { Dirent } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";

import type { Configuration } from "../configuration.js";
import type { Logger } from "../logger.js";
import type { CatalogRepository, CourseOrder } from "./catalog.repository.js";
import { readCourseMetadata } from "./course-metadata.js";
import { displayName, naturalOrder } from "./names.js";
import { posixPath } from "./path.js";
import { probeVideo, videoExtensions, type VideoProbe } from "./probe.js";
import { readVideoMetadata } from "./video-metadata.js";
import type {
  CatalogSnapshot,
  ChapterRecord,
  CourseRecord,
  LessonRecord,
  ScanStatus,
  ScanWarning,
  SectionRecord,
} from "./types.js";

const coverExtensions = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const ignoredDirectoryNames = new Set(["@eadir", "#recycle"]);

function isCatalogDirectory(entry: Dirent): boolean {
  return (
    entry.isDirectory() &&
    !entry.name.startsWith(".") &&
    !ignoredDirectoryNames.has(entry.name.toLowerCase())
  );
}

export interface Scanner {
  scanCatalog(): Promise<ScanStatus>;
  getScanStatus(): ScanStatus;
  startMonitoring(): () => void;
}

export interface ScannerDependencies {
  configuration: Configuration;
  repository: CatalogRepository;
  logger: Logger;
  probe?: (filename: string, ffprobePath: string) => Promise<VideoProbe>;
  watchDirectory?: WatchDirectory;
}

interface DirectoryWatcher {
  on(event: "error", listener: (error: Error) => void): this;
  close(): void;
}

type WatchDirectory = (
  directory: string,
  options: { recursive: true },
  listener: (event: string, filename: string | Buffer | null) => void,
) => DirectoryWatcher;

function identifier(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 24);
}

export function createScanner({
  configuration,
  repository,
  logger,
  probe = probeVideo,
  watchDirectory = watch,
}: ScannerDependencies): Scanner {
  let activeSynchronization: Promise<void> | null = null;
  let fullScanInProgress = false;
  let fullScanRequested = false;
  const requestedCourses = new Set<string>();
  const courseWarnings = new Map<string, ScanWarning[]>();
  let scanStatus: ScanStatus = {
    status: "idle",
    startedAt: null,
    completedAt: null,
    courseCount: 0,
    lessonCount: 0,
    warnings: [],
    error: null,
  };

  function currentWarnings(): ScanWarning[] {
    return [...courseWarnings.values()].flat();
  }

  function replaceCourseWarnings(
    courseNames: Iterable<string> | null,
    warnings: ScanWarning[],
  ): void {
    if (courseNames === null) courseWarnings.clear();
    else for (const courseName of courseNames) courseWarnings.delete(courseName);

    for (const warning of warnings) {
      const courseName = warning.path.split("/")[0];
      if (!courseName) continue;
      const warningsForCourse = courseWarnings.get(courseName) ?? [];
      warningsForCourse.push(warning);
      courseWarnings.set(courseName, warningsForCourse);
    }
  }

  async function scanOnce(courseNames?: string[]): Promise<ScanStatus> {
    const startedAt = new Date().toISOString();
    const scanWarnings: ScanWarning[] = [];
    const scanning: ScanStatus = {
      status: "scanning",
      startedAt,
      completedAt: null,
      courseCount: scanStatus.courseCount,
      lessonCount: scanStatus.lessonCount,
      warnings: currentWarnings(),
      error: null,
    };
    scanStatus = scanning;

    try {
      if (courseNames) {
        const courseEntries = await readCourseEntries(configuration);
        const storedCourses = await repository.getCourses();
        const currentCoursePaths = new Set(courseEntries.map((entry) => posixPath(entry.name)));
        const storedCoursePaths = new Set(storedCourses.map((course) => course.path));
        const requestedCourseNames = new Set(courseNames);
        const courseNamesToScan = courseEntries
          .filter(
            (entry) =>
              requestedCourseNames.has(entry.name) || !storedCoursePaths.has(posixPath(entry.name)),
          )
          .map((entry) => entry.name);
        const courseIdsToScan = courseNamesToScan.map((courseName) => identifier(courseName));
        const removedCourses = storedCourses.filter(
          (course) => !currentCoursePaths.has(course.path),
        );
        const removedCourseIds = removedCourses.map((course) => course.id);
        const synchronizedCourseNames = new Set([
          ...courseNamesToScan,
          ...removedCourses.map((course) => course.path),
        ]);
        const existingLessons = await repository.getLessons(courseIdsToScan);
        const { snapshot, courseOrder } = await buildCatalogSnapshot(
          configuration,
          scanWarnings,
          probe,
          existingLessons,
          courseEntries,
          courseNamesToScan,
        );
        await repository.synchronizeCourses(
          snapshot,
          [...courseIdsToScan, ...removedCourseIds],
          courseOrder,
        );
        replaceCourseWarnings(synchronizedCourseNames, scanWarnings);
      } else {
        const [courseEntries, existingLessons] = await Promise.all([
          readCourseEntries(configuration),
          repository.getLessons(),
        ]);
        const { snapshot } = await buildCatalogSnapshot(
          configuration,
          scanWarnings,
          probe,
          existingLessons,
          courseEntries,
        );
        await repository.synchronizeCatalog(snapshot);
        replaceCourseWarnings(null, scanWarnings);
      }
      const counts = await repository.getCatalogCounts();
      const complete: ScanStatus = {
        ...scanning,
        status: "complete",
        completedAt: new Date().toISOString(),
        warnings: currentWarnings(),
        ...counts,
      };
      scanStatus = complete;
      logger.info("Media scan complete", {
        courses: complete.courseCount,
        lessons: complete.lessonCount,
        warnings: complete.warnings.length,
      });
      return complete;
    } catch (error) {
      const failed: ScanStatus = {
        ...scanning,
        status: "failed",
        completedAt: new Date().toISOString(),
        warnings: currentWarnings(),
        error: error instanceof Error ? error.message : "Media scan failed",
      };
      scanStatus = failed;
      logger.error("Media scan failed", { error });
      return failed;
    }
  }

  async function drainRequests(): Promise<void> {
    while (fullScanRequested || requestedCourses.size > 0) {
      if (fullScanRequested) {
        fullScanRequested = false;
        requestedCourses.clear();
        fullScanInProgress = true;
        try {
          await scanOnce();
        } finally {
          fullScanInProgress = false;
        }
        continue;
      }
      const courseNames = [...requestedCourses];
      requestedCourses.clear();
      await scanOnce(courseNames);
    }
  }

  function ensureSynchronization(): Promise<void> {
    if (!activeSynchronization) {
      activeSynchronization = drainRequests().finally(() => {
        activeSynchronization = null;
        if (fullScanRequested || requestedCourses.size > 0) void ensureSynchronization();
      });
    }
    return activeSynchronization;
  }

  async function waitForSynchronization(): Promise<ScanStatus> {
    do {
      await ensureSynchronization();
    } while (activeSynchronization || fullScanRequested || requestedCourses.size > 0);
    return scanStatus;
  }

  function requestCourseSynchronization(courseNames: Iterable<string>): void {
    if (!fullScanRequested) {
      for (const courseName of courseNames) requestedCourses.add(courseName);
    }
    void ensureSynchronization();
  }

  const scanner: Scanner = {
    scanCatalog() {
      if (!fullScanInProgress) {
        fullScanRequested = true;
        requestedCourses.clear();
      }
      return waitForSynchronization();
    },
    getScanStatus: () => scanStatus,
    startMonitoring() {
      let debounce: NodeJS.Timeout | null = null;
      const changedCourses = new Set<string>();
      const watcher = watchDirectory(
        configuration.media.videosDirectory,
        { recursive: true },
        (_event, filename) => {
          if (!filename) {
            fullScanRequested = true;
          } else {
            const courseName = posixPath(String(filename)).split("/")[0];
            if (
              courseName &&
              !courseName.startsWith(".") &&
              !ignoredDirectoryNames.has(courseName.toLowerCase())
            ) {
              changedCourses.add(courseName);
            }
          }
          if (debounce) clearTimeout(debounce);
          debounce = setTimeout(() => {
            debounce = null;
            if (fullScanRequested) void ensureSynchronization();
            else requestCourseSynchronization(changedCourses);
            changedCourses.clear();
          }, 750);
          debounce.unref();
        },
      );
      const schedule = setInterval(
        () => void scanner.scanCatalog(),
        configuration.media.scanIntervalMs,
      );
      schedule.unref();
      let watcherActive = true;
      watcher.on("error", (error) => {
        if (!watcherActive) return;
        watcherActive = false;
        if (debounce) clearTimeout(debounce);
        watcher.close();
        logger.warn("Library watcher unavailable; scheduled scans will continue", { error });
      });

      return () => {
        clearInterval(schedule);
        if (debounce) clearTimeout(debounce);
        if (watcherActive) watcher.close();
      };
    },
  };
  return scanner;
}

interface BuiltCatalogSnapshot {
  snapshot: CatalogSnapshot;
  courseOrder: CourseOrder[];
}

async function readCourseEntries(configuration: Configuration): Promise<Dirent[]> {
  return (await fs.readdir(configuration.media.videosDirectory, { withFileTypes: true }))
    .filter(isCatalogDirectory)
    .sort((left, right) => naturalOrder(left.name, right.name));
}

async function buildCatalogSnapshot(
  configuration: Configuration,
  warnings: ScanWarning[],
  probe: (filename: string, ffprobePath: string) => Promise<VideoProbe>,
  existingLessons: LessonRecord[],
  courseEntries: Dirent[],
  requestedCourseNames?: string[],
): Promise<BuiltCatalogSnapshot> {
  const root = configuration.media.videosDirectory;
  const requestedNames = requestedCourseNames ? new Set(requestedCourseNames) : null;
  const entriesToScan = requestedNames
    ? courseEntries.filter((entry) => requestedNames.has(entry.name))
    : courseEntries;
  const courseOrder = courseEntries.map((entry, sortOrder) => ({
    id: identifier(posixPath(entry.name)),
    sortOrder,
  }));
  const existingLessonsByPath = new Map(existingLessons.map((lesson) => [lesson.path, lesson]));
  const courses: CourseRecord[] = [];
  const sections: SectionRecord[] = [];
  const lessons: LessonRecord[] = [];
  const chapters: ChapterRecord[] = [];
  const skippedLessonIds: string[] = [];

  for (const courseEntry of entriesToScan) {
    const courseDirectory = path.join(root, courseEntry.name);
    const courseRelativePath = posixPath(path.relative(root, courseDirectory));
    const courseId = identifier(courseRelativePath);
    const { metadata, warning } = await readCourseMetadata(courseDirectory);
    if (warning) warnings.push({ path: `${courseRelativePath}/course.json`, message: warning });
    const entries = (await fs.readdir(courseDirectory, { withFileTypes: true })).sort(
      (left, right) => naturalOrder(left.name, right.name),
    );
    const localCover = await findCover(
      courseDirectory,
      courseRelativePath,
      entries,
      metadata?.cover,
      warnings,
    );
    const course: CourseRecord = {
      id: courseId,
      path: courseRelativePath,
      title: metadata?.title ?? courseEntry.name,
      description: metadata?.description ?? "",
      category: metadata?.category ?? "Uncategorized",
      instructors: metadata?.instructors ?? [],
      tags: metadata?.tags ?? [],
      coverPath: localCover ? posixPath(path.relative(root, localCover)) : null,
      sortOrder: courseEntries.findIndex((entry) => entry.name === courseEntry.name),
    };
    let courseVideoCount = 0;

    const directVideos = entries.filter(
      (entry) => entry.isFile() && videoExtensions.has(path.extname(entry.name).toLowerCase()),
    );
    courseVideoCount += directVideos.length;
    await appendLessons({
      files: directVideos,
      directory: courseDirectory,
      root,
      courseId,
      sectionId: null,
      lessons,
      chapters,
      skippedLessonIds,
      warnings,
      probe,
      existingLessonsByPath,
      ffprobePath: configuration.media.ffprobePath,
    });

    const sectionEntries = entries.filter(isCatalogDirectory);
    let sectionIndex = 0;
    for (const sectionEntry of sectionEntries) {
      const sectionDirectory = path.join(courseDirectory, sectionEntry.name);
      const sectionRelativePath = posixPath(path.relative(root, sectionDirectory));
      const sectionId = identifier(sectionRelativePath);
      const sectionFiles = (await fs.readdir(sectionDirectory, { withFileTypes: true }))
        .filter(
          (entry) => entry.isFile() && videoExtensions.has(path.extname(entry.name).toLowerCase()),
        )
        .sort((left, right) => naturalOrder(left.name, right.name));
      if (sectionFiles.length === 0) continue;
      courseVideoCount += sectionFiles.length;
      sections.push({
        id: sectionId,
        courseId,
        path: sectionRelativePath,
        title: displayName(sectionEntry.name),
        sortOrder: sectionIndex++,
      });
      await appendLessons({
        files: sectionFiles,
        directory: sectionDirectory,
        root,
        courseId,
        sectionId,
        lessons,
        chapters,
        skippedLessonIds,
        warnings,
        probe,
        existingLessonsByPath,
        ffprobePath: configuration.media.ffprobePath,
      });
    }

    if (courseVideoCount === 0) continue;
    courses.push(course);
  }

  return {
    snapshot: { courses, sections, lessons, chapters, skippedLessonIds },
    courseOrder,
  };
}

interface AppendLessonsOptions {
  files: Dirent[];
  directory: string;
  root: string;
  courseId: string;
  sectionId: string | null;
  lessons: LessonRecord[];
  chapters: ChapterRecord[];
  skippedLessonIds: string[];
  warnings: ScanWarning[];
  probe: (filename: string, ffprobePath: string) => Promise<VideoProbe>;
  existingLessonsByPath: Map<string, LessonRecord>;
  ffprobePath: string;
}

async function appendLessons(options: AppendLessonsOptions): Promise<void> {
  for (const [index, file] of options.files.entries()) {
    const absolutePath = path.join(options.directory, file.name);
    const relativePath = posixPath(path.relative(options.root, absolutePath));
    const sidecarPath = `${relativePath}.json`;
    const { metadata: videoMetadata, warning } = await readVideoMetadata(absolutePath);
    if (warning) options.warnings.push({ path: sidecarPath, message: warning });
    try {
      const fileStats = await fs.stat(absolutePath);
      const modifiedAt = fileStats.mtime.toISOString();
      const existing = options.existingLessonsByPath.get(relativePath);
      const video =
        existing && existing.modifiedAt === modifiedAt && existing.sizeBytes === fileStats.size
          ? existing
          : await options.probe(absolutePath, options.ffprobePath);
      const lessonId = identifier(relativePath);
      options.lessons.push({
        id: lessonId,
        courseId: options.courseId,
        sectionId: options.sectionId,
        path: relativePath,
        title: displayName(file.name),
        sortOrder: index,
        durationSeconds: video.durationSeconds,
        sizeBytes: video.sizeBytes,
        container: video.container,
        videoCodec: video.videoCodec,
        audioCodec: video.audioCodec,
        browserCompatible: video.browserCompatible,
        modifiedAt,
      });
      for (const [chapterIndex, chapter] of (videoMetadata?.chapters ?? []).entries()) {
        if (chapter.startSeconds >= video.durationSeconds) {
          options.warnings.push({
            path: sidecarPath,
            message: `Chapter “${chapter.title}” starts outside ${file.name}`,
          });
          continue;
        }
        options.chapters.push({
          id: identifier(`${relativePath}\0${chapter.startSeconds}`),
          lessonId,
          title: chapter.title,
          startSeconds: chapter.startSeconds,
          sortOrder: chapterIndex,
        });
      }
    } catch (error) {
      options.skippedLessonIds.push(identifier(relativePath));
      options.warnings.push({
        path: relativePath,
        message: error instanceof Error ? error.message : "Could not inspect video",
      });
    }
  }
}

async function findCover(
  courseDirectory: string,
  courseRelativePath: string,
  entries: Dirent[],
  requestedCover: string | undefined,
  warnings: ScanWarning[],
): Promise<string | null> {
  if (requestedCover) {
    const warningPath = `${courseRelativePath}/${posixPath(requestedCover)}`;
    const requestedPath = path.resolve(courseDirectory, requestedCover);
    const relative = path.relative(courseDirectory, requestedPath);
    if (relative.startsWith("..") || path.isAbsolute(relative)) {
      warnings.push({ path: warningPath, message: "Cover path leaves the course directory" });
    } else if (!coverExtensions.has(path.extname(requestedPath).toLowerCase())) {
      warnings.push({ path: warningPath, message: "Cover must be a JPG, PNG, or WebP image" });
    } else {
      try {
        if ((await fs.stat(requestedPath)).isFile()) return requestedPath;
      } catch {
        warnings.push({ path: warningPath, message: "Configured cover does not exist" });
      }
    }
  }

  const cover = entries.find(
    (entry) => entry.isFile() && coverExtensions.has(path.extname(entry.name).toLowerCase()),
  );
  return cover ? path.join(courseDirectory, cover.name) : null;
}
