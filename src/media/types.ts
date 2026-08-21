export interface PlaylistRecord {
  id: string;
  path: string;
  title: string;
  description: string;
  category: string;
  authors: string[];
  tags: string[];
  coverPath: string | null;
  sortOrder: number;
}

export interface PlaylistSectionRecord {
  id: string;
  playlistId: string;
  path: string;
  title: string;
  sortOrder: number;
}

export interface VideoRecord {
  id: string;
  path: string;
  title: string;
  description: string;
  category: string;
  authors: string[];
  tags: string[];
  coverPath: string | null;
  durationSeconds: number;
  sizeBytes: number;
  container: string;
  videoCodec: string;
  audioCodec: string | null;
  browserCompatible: boolean;
  modifiedAt: string;
}

export interface PlaylistVideoRecord {
  playlistId: string;
  videoId: string;
  sectionId: string | null;
  sortOrder: number;
}

export interface ChapterRecord {
  id: string;
  videoId: string;
  title: string;
  startSeconds: number;
  sortOrder: number;
}

export interface CatalogSnapshot {
  playlists: PlaylistRecord[];
  playlistSections: PlaylistSectionRecord[];
  videos: VideoRecord[];
  playlistVideos: PlaylistVideoRecord[];
  chapters: ChapterRecord[];
  skippedVideoIds: string[];
}

export interface ScanWarning {
  path: string;
  message: string;
}

export interface ScanStatus {
  status: "idle" | "scanning" | "complete" | "failed";
  startedAt: string | null;
  completedAt: string | null;
  playlistCount: number;
  videoCount: number;
  warnings: ScanWarning[];
  error: string | null;
}
