import { createHash } from "node:crypto";
import type { Dirent } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";

import type { Configuration } from "../configuration.js";
import type { Logger } from "../logger.js";
import type { CatalogRepository } from "./catalog.repository.js";
import { readCourseMetadata } from "./course-metadata.js";
import { generateCover } from "./cover.js";
import { displayName, naturalOrder } from "./names.js";
import { posixPath } from "./path.js";
import { probeVideo, videoExtensions, type VideoProbe } from "./probe.js";
import type {
  CatalogSnapshot,
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
  getScanStatus(): Promise<ScanStatus>;
  startSchedule(): () => void;
}

export interface ScannerDependencies {
  configuration: Configuration;
  repository: CatalogRepository;
  logger: Logger;
  probe?: (filename: string, ffprobePath: string) => Promise<VideoProbe>;
}

function identifier(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 24);
}

export function createScanner({
  configuration,
  repository,
  logger,
  probe = probeVideo,
}: ScannerDependencies): Scanner {
  let activeScan: Promise<ScanStatus> | null = null;

  async function scanOnce(): Promise<ScanStatus> {
    const startedAt = new Date().toISOString();
    const scanning: ScanStatus = {
      status: "scanning",
      startedAt,
      completedAt: null,
      courseCount: 0,
      lessonCount: 0,
      warnings: [],
      error: null,
    };
    await repository.updateScanStatus(scanning);

    try {
      const snapshot = await scanCatalog(configuration, scanning.warnings, probe);
      await repository.synchronizeCatalog(snapshot);
      const complete: ScanStatus = {
        ...scanning,
        status: "complete",
        completedAt: new Date().toISOString(),
        courseCount: snapshot.courses.length,
        lessonCount: snapshot.lessons.length,
      };
      await repository.updateScanStatus(complete);
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
        error: error instanceof Error ? error.message : "Media scan failed",
      };
      await repository.updateScanStatus(failed);
      logger.error("Media scan failed", { error: error instanceof Error ? error : String(error) });
      return failed;
    }
  }

  const scanner: Scanner = {
    scanCatalog() {
      if (activeScan) return activeScan;
      activeScan = scanOnce().finally(() => {
        activeScan = null;
      });
      return activeScan;
    },
    getScanStatus: () => repository.getScanStatus(),
    startSchedule() {
      const timer = setInterval(
        () => void scanner.scanCatalog(),
        configuration.media.scanIntervalMs,
      );
      timer.unref();
      return () => clearInterval(timer);
    },
  };
  return scanner;
}

async function scanCatalog(
  configuration: Configuration,
  warnings: ScanWarning[],
  probe: (filename: string, ffprobePath: string) => Promise<VideoProbe>,
): Promise<CatalogSnapshot> {
  const root = configuration.media.videosDirectory;
  const courseEntries = (await fs.readdir(root, { withFileTypes: true }))
    .filter(isCatalogDirectory)
    .sort((left, right) => naturalOrder(left.name, right.name));
  const courses: CourseRecord[] = [];
  const sections: SectionRecord[] = [];
  const lessons: LessonRecord[] = [];
  const skippedLessonIds: string[] = [];

  for (const courseEntry of courseEntries) {
    const courseDirectory = path.join(root, courseEntry.name);
    const courseRelativePath = posixPath(path.relative(root, courseDirectory));
    const courseId = identifier(courseRelativePath);
    const { metadata, warning } = await readCourseMetadata(courseDirectory);
    if (warning) warnings.push({ path: `${courseRelativePath}/course.json`, message: warning });
    const entries = (await fs.readdir(courseDirectory, { withFileTypes: true })).sort(
      (left, right) => naturalOrder(left.name, right.name),
    );
    const localCover = await findCover(courseDirectory, entries, metadata?.cover, warnings);
    const course: CourseRecord = {
      id: courseId,
      path: courseRelativePath,
      title: metadata?.title ?? courseEntry.name,
      description: metadata?.description ?? "",
      category: metadata?.category ?? "Uncategorized",
      instructors: metadata?.instructors ?? [],
      tags: metadata?.tags ?? [],
      coverPath: localCover ? posixPath(path.relative(root, localCover)) : null,
      coverOrigin: localCover ? "videos" : null,
      sortOrder: courses.length,
    };
    const courseLessonStart = lessons.length;
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
      skippedLessonIds,
      warnings,
      probe,
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
        skippedLessonIds,
        warnings,
        probe,
        ffprobePath: configuration.media.ffprobePath,
      });
    }

    if (courseVideoCount === 0) continue;
    courses.push(course);

    if (!course.coverPath) {
      const firstLesson = lessons.slice(courseLessonStart).at(0);
      if (firstLesson) {
        const generatedFilename = `${courseId}.jpg`;
        try {
          await generateCover(
            path.join(root, firstLesson.path),
            path.join(configuration.media.generatedCoversDirectory, generatedFilename),
            configuration.media.ffmpegPath,
          );
          course.coverPath = generatedFilename;
          course.coverOrigin = "data";
        } catch (error) {
          warnings.push({
            path: courseRelativePath,
            message: `Could not generate cover: ${error instanceof Error ? error.message : "unknown error"}`,
          });
        }
      }
    }
  }

  return { courses, sections, lessons, skippedLessonIds };
}

interface AppendLessonsOptions {
  files: Dirent[];
  directory: string;
  root: string;
  courseId: string;
  sectionId: string | null;
  lessons: LessonRecord[];
  skippedLessonIds: string[];
  warnings: ScanWarning[];
  probe: (filename: string, ffprobePath: string) => Promise<VideoProbe>;
  ffprobePath: string;
}

async function appendLessons(options: AppendLessonsOptions): Promise<void> {
  for (const [index, file] of options.files.entries()) {
    const absolutePath = path.join(options.directory, file.name);
    const relativePath = posixPath(path.relative(options.root, absolutePath));
    try {
      const [metadata, video] = await Promise.all([
        fs.stat(absolutePath),
        options.probe(absolutePath, options.ffprobePath),
      ]);
      options.lessons.push({
        id: identifier(relativePath),
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
        modifiedAt: metadata.mtime.toISOString(),
      });
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
  entries: Dirent[],
  requestedCover: string | undefined,
  warnings: ScanWarning[],
): Promise<string | null> {
  if (requestedCover) {
    const requestedPath = path.resolve(courseDirectory, requestedCover);
    const relative = path.relative(courseDirectory, requestedPath);
    if (relative.startsWith("..") || path.isAbsolute(relative)) {
      warnings.push({ path: requestedCover, message: "Cover path leaves the course directory" });
    } else if (!coverExtensions.has(path.extname(requestedPath).toLowerCase())) {
      warnings.push({ path: requestedCover, message: "Cover must be a JPG, PNG, or WebP image" });
    } else {
      try {
        if ((await fs.stat(requestedPath)).isFile()) return requestedPath;
      } catch {
        warnings.push({ path: requestedCover, message: "Configured cover does not exist" });
      }
    }
  }

  const cover = entries.find(
    (entry) => entry.isFile() && coverExtensions.has(path.extname(entry.name).toLowerCase()),
  );
  return cover ? path.join(courseDirectory, cover.name) : null;
}
