export interface PlaylistRecord {
  id: string;
  path: string;
  title: string;
  description: string;
  tags: string[];
  coverPath: string | null;
  sourceProvider: string | null;
  sourceUrl: string | null;
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
  playlistId: string | null;
  playlistSectionId: string | null;
  title: string;
  description: string;
  tags: string[];
  sourceProvider: string | null;
  sourceUrl: string | null;
  sortOrder: number;
  durationSeconds: number;
  sizeBytes: number;
  container: string;
  videoCodec: string;
  audioCodec: string | null;
  browserCompatible: boolean;
  modifiedAt: string;
}

export interface AuthorRecord {
  id: string;
  name: string;
  normalizedName: string;
}

export interface PlaylistAuthorRecord {
  playlistId: string;
  authorId: string;
  sortOrder: number;
}

export interface VideoAuthorRecord {
  videoId: string;
  authorId: string;
  sortOrder: number;
}

export interface ChapterRecord {
  id: string;
  videoId: string;
  title: string;
  startSeconds: number;
  sortOrder: number;
}

export interface LibrarySnapshot {
  playlists: PlaylistRecord[];
  playlistSections: PlaylistSectionRecord[];
  videos: VideoRecord[];
  authors: AuthorRecord[];
  playlistAuthors: PlaylistAuthorRecord[];
  videoAuthors: VideoAuthorRecord[];
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
