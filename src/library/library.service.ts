import type {
  ChapterRow,
  FilterCountRow,
  LibraryRepository,
  PlaylistRow,
  VideoFilters,
  VideoRow,
} from "./library.repository.js";

export interface VideoDto {
  id: string;
  playlistId: string | null;
  playlistTitle: string | null;
  playlistSectionId: string | null;
  playlistSectionTitle: string | null;
  title: string;
  description: string;
  authors: string[];
  tags: string[];
  source: { provider: string; url: string } | null;
  coverUrl: string | null;
  durationSeconds: number;
  positionSeconds: number;
  completed: boolean;
  progressPercent: number;
}

export interface ChapterDto {
  title: string;
  startSeconds: number;
}

export interface VideoDetailDto extends VideoDto {
  chapters: ChapterDto[];
}

export interface PlaylistDto {
  id: string;
  title: string;
  description: string;
  authors: string[];
  tags: string[];
  source: { provider: string; url: string } | null;
  coverUrl: string | null;
  videoCount: number;
  completedCount: number;
  progressPercent: number;
  durationSeconds: number;
}

export interface PlaylistDetailDto extends PlaylistDto {
  sections: Array<{
    id: string | null;
    title: string;
    videos: VideoDto[];
  }>;
}

export interface LibraryFilterDto {
  name: string;
  videoCount: number;
}

export interface LibraryFilters extends VideoFilters {
  page?: number;
  pageSize?: number;
}

export interface LibraryPaginationDto {
  page: number;
  pageSize: number;
  totalVideos: number;
  totalPages: number;
}

export interface LibraryService {
  getLibrary(filters?: LibraryFilters): Promise<{
    videos: VideoDto[];
    playlists: PlaylistDto[];
    authors: LibraryFilterDto[];
    tags: LibraryFilterDto[];
    continueWatching: VideoDto[];
    pagination: LibraryPaginationDto;
  }>;
  getPlaylist(playlistId: string): Promise<PlaylistDetailDto | null>;
  getVideo(videoId: string): Promise<{
    video: VideoDetailDto;
    playlist: PlaylistDetailDto | null;
  } | null>;
  findVideoRecord(videoId: string): Promise<VideoRow | undefined>;
}

export interface LibrarySettings {
  getLibraryPageSize(): Promise<number>;
}

function stringList(value: string | null): string[] {
  return value ? (JSON.parse(value) as string[]) : [];
}

function mergeNames(...lists: string[][]): string[] {
  const seen = new Set<string>();
  return lists.flat().filter((value) => {
    const key = value.toLocaleLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function sourceDto(provider: string | null, url: string | null) {
  return provider && url ? { provider, url } : null;
}

function progressPercent(completed: number, total: number): number {
  return total === 0 ? 0 : Math.round((completed / total) * 100);
}

function videoDto(row: VideoRow): VideoDto {
  const position = row.completed ? Number(row.duration_seconds) : Number(row.position_seconds ?? 0);
  return {
    id: row.id,
    playlistId: row.playlist_id,
    playlistTitle: row.playlist_title,
    playlistSectionId: row.playlist_section_id,
    playlistSectionTitle: row.playlist_section_title,
    title: row.title,
    description: row.description,
    authors: mergeNames(stringList(row.authors_json), stringList(row.playlist_authors_json)),
    tags: mergeNames(stringList(row.tags_json), stringList(row.playlist_tags_json)),
    source: sourceDto(row.source_provider, row.source_url),
    coverUrl: row.cover_path || row.playlist_cover_path ? `/covers/videos/${row.id}` : null,
    durationSeconds: Number(row.duration_seconds),
    positionSeconds: position,
    completed: Boolean(row.completed),
    progressPercent: Math.min(100, Math.round((position / Number(row.duration_seconds)) * 100)),
  };
}

function playlistDto(row: PlaylistRow): PlaylistDto {
  const videoCount = Number(row.video_count);
  const completedCount = Number(row.completed_count);
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    authors: stringList(row.authors_json),
    tags: stringList(row.tags_json),
    source: sourceDto(row.source_provider, row.source_url),
    coverUrl: row.cover_path ? `/covers/playlists/${row.id}` : null,
    videoCount,
    completedCount,
    progressPercent: progressPercent(completedCount, videoCount),
    durationSeconds: Number(row.total_duration),
  };
}

function filterDto(row: FilterCountRow): LibraryFilterDto {
  return { name: row.name, videoCount: Number(row.video_count) };
}

function chapterDto(row: ChapterRow): ChapterDto {
  return { title: row.title, startSeconds: Number(row.start_seconds) };
}

export function createLibraryService(
  repository: LibraryRepository,
  settings: LibrarySettings,
): LibraryService {
  async function getPlaylist(playlistId: string): Promise<PlaylistDetailDto | null> {
    const [playlistRow, videoRows] = await Promise.all([
      repository.findPlaylist(playlistId),
      repository.listPlaylistVideos(playlistId),
    ]);
    if (!playlistRow) return null;

    const sectionMap = new Map<string, PlaylistDetailDto["sections"][number]>();
    for (const row of videoRows) {
      const key = row.playlist_section_id ?? "__direct";
      const section = sectionMap.get(key) ?? {
        id: row.playlist_section_id,
        title: row.playlist_section_title ?? "Videos",
        videos: [],
      };
      section.videos.push(videoDto(row));
      sectionMap.set(key, section);
    }
    return { ...playlistDto(playlistRow), sections: [...sectionMap.values()] };
  }

  return {
    async getLibrary(filters) {
      const {
        page: requestedPage = 1,
        pageSize: requestedPageSize,
        ...videoFilters
      } = filters ?? {};
      const configuredPageSize = requestedPageSize ?? (await settings.getLibraryPageSize());
      const pageSize = Math.min(100, Math.max(1, configuredPageSize));
      const totalVideos = await repository.countVideos(videoFilters);
      const totalPages = Math.ceil(totalVideos / pageSize);
      const page = totalPages === 0 ? 1 : Math.min(Math.max(1, requestedPage), totalPages);

      const [videos, playlists, authors, tags, continuing] = await Promise.all([
        repository.listVideos(videoFilters, { limit: pageSize, offset: (page - 1) * pageSize }),
        repository.listPlaylists({ author: videoFilters.author }),
        repository.listAuthors(),
        repository.listTags(),
        repository.listContinueWatching(),
      ]);
      return {
        videos: videos.map(videoDto),
        playlists: playlists.map(playlistDto),
        authors: authors.map(filterDto),
        tags: tags.map(filterDto),
        continueWatching: continuing.map(videoDto),
        pagination: { page, pageSize, totalVideos, totalPages },
      };
    },
    getPlaylist,
    async getVideo(videoId) {
      const row = await repository.findVideo(videoId);
      if (!row) return null;
      const [chapters, playlist] = await Promise.all([
        repository.listVideoChapters(videoId),
        row.playlist_id ? getPlaylist(row.playlist_id) : Promise.resolve(null),
      ]);
      return {
        video: { ...videoDto(row), chapters: chapters.map(chapterDto) },
        playlist,
      };
    },
    findVideoRecord: (videoId) => repository.findVideo(videoId),
  };
}
