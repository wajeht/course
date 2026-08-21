import type { Knex } from "knex";

export interface PlaylistRow {
  id: string;
  title: string;
  description: string;
  tags_json: string;
  cover_path: string | null;
  source_provider: string | null;
  source_url: string | null;
  authors_json: string;
  video_count: number;
  completed_count: number;
  total_duration: number;
}

export interface VideoRow {
  id: string;
  path: string;
  playlist_id: string | null;
  playlist_title: string | null;
  playlist_cover_path: string | null;
  playlist_tags_json: string | null;
  playlist_authors_json: string;
  playlist_section_id: string | null;
  playlist_section_title: string | null;
  title: string;
  description: string;
  tags_json: string;
  authors_json: string;
  cover_path: string | null;
  source_provider: string | null;
  source_url: string | null;
  duration_seconds: number;
  browser_compatible: number;
  video_codec: string;
  audio_codec: string | null;
  container: string;
  position_seconds: number | null;
  completed: number | null;
  progress_updated_at: string | null;
  sort_order: number;
  playlist_section_sort_order: number | null;
}

export interface ChapterRow {
  id: string;
  video_id: string;
  title: string;
  start_seconds: number;
  sort_order: number;
}

export interface FilterCountRow {
  name: string;
  video_count: number;
}

export interface VideoFilters {
  query?: string;
  author?: string[];
  tag?: string[];
}

export interface VideoPagination {
  limit: number;
  offset: number;
}

export interface LibraryRepository {
  listVideos(filters?: VideoFilters, pagination?: VideoPagination): Promise<VideoRow[]>;
  countVideos(filters?: VideoFilters): Promise<number>;
  listPlaylists(filters?: Pick<VideoFilters, "author">): Promise<PlaylistRow[]>;
  listAuthors(): Promise<FilterCountRow[]>;
  listTags(): Promise<FilterCountRow[]>;
  listContinueWatching(): Promise<VideoRow[]>;
  findPlaylist(playlistId: string): Promise<PlaylistRow | undefined>;
  listPlaylistVideos(playlistId: string): Promise<VideoRow[]>;
  findVideo(videoId: string): Promise<VideoRow | undefined>;
  listVideoChapters(videoId: string): Promise<ChapterRow[]>;
}

const videoSelect = [
  "videos.id",
  "videos.path",
  "videos.playlist_id",
  "playlists.title as playlist_title",
  "playlists.cover_path as playlist_cover_path",
  "playlists.tags_json as playlist_tags_json",
  "videos.playlist_section_id",
  "playlist_sections.title as playlist_section_title",
  "videos.title",
  "videos.description",
  "videos.tags_json",
  "videos.cover_path",
  "videos.source_provider",
  "videos.source_url",
  "videos.duration_seconds",
  "videos.browser_compatible",
  "videos.video_codec",
  "videos.audio_codec",
  "videos.container",
  "progress.position_seconds",
  "progress.completed",
  "progress.updated_at as progress_updated_at",
  "videos.sort_order",
  "playlist_sections.sort_order as playlist_section_sort_order",
];

export function createLibraryApiRepository(database: Knex): LibraryRepository {
  const videoAuthorsJson = database.raw(`
    COALESCE((
      SELECT json_group_array(name)
      FROM (
        SELECT video_authors.video_id, authors.name
        FROM video_authors
        JOIN authors ON authors.id = video_authors.author_id
        ORDER BY video_authors.video_id, video_authors.sort_order
      ) AS ordered_video_authors
      WHERE ordered_video_authors.video_id = videos.id
    ), '[]') AS authors_json
  `);
  const playlistAuthorsJson = database.raw(`
    COALESCE((
      SELECT json_group_array(name)
      FROM (
        SELECT playlist_authors.playlist_id, authors.name
        FROM playlist_authors
        JOIN authors ON authors.id = playlist_authors.author_id
        ORDER BY playlist_authors.playlist_id, playlist_authors.sort_order
      ) AS ordered_playlist_authors
      WHERE ordered_playlist_authors.playlist_id = videos.playlist_id
    ), '[]') AS playlist_authors_json
  `);

  function createVideosQuery() {
    return database<VideoRow>("videos")
      .leftJoin("playlists", "playlists.id", "videos.playlist_id")
      .leftJoin("playlist_sections", "playlist_sections.id", "videos.playlist_section_id")
      .leftJoin("progress", "progress.video_id", "videos.id")
      .select([...videoSelect, videoAuthorsJson, playlistAuthorsJson]);
  }

  function createPlaylistsQuery() {
    return database<PlaylistRow>("playlists")
      .leftJoin("videos", "videos.playlist_id", "playlists.id")
      .leftJoin("progress", "progress.video_id", "videos.id")
      .select(
        "playlists.id",
        "playlists.title",
        "playlists.description",
        "playlists.tags_json",
        "playlists.cover_path",
        "playlists.source_provider",
        "playlists.source_url",
        database.raw(`
          COALESCE((
            SELECT json_group_array(name)
            FROM (
              SELECT playlist_authors.playlist_id, authors.name
              FROM playlist_authors
              JOIN authors ON authors.id = playlist_authors.author_id
              ORDER BY playlist_authors.playlist_id, playlist_authors.sort_order
            ) AS ordered_playlist_authors
            WHERE ordered_playlist_authors.playlist_id = playlists.id
          ), '[]') AS authors_json
        `),
        database.raw("COUNT(DISTINCT videos.id) as video_count"),
        database.raw(
          "COUNT(DISTINCT CASE WHEN progress.completed = 1 THEN videos.id END) as completed_count",
        ),
        database.raw("COALESCE(SUM(videos.duration_seconds), 0) as total_duration"),
      )
      .groupBy("playlists.id");
  }

  function applyVideoFilters(
    queryBuilder: Knex.QueryBuilder,
    { query, author, tag }: VideoFilters = {},
  ): void {
    if (author?.length) {
      const placeholders = author.map(() => "?").join(", ");
      queryBuilder.where((where) => {
        where
          .whereExists(
            database("video_authors")
              .join("authors", "authors.id", "video_authors.author_id")
              .select(database.raw("1"))
              .whereRaw("video_authors.video_id = videos.id")
              .whereRaw(`authors.name COLLATE NOCASE IN (${placeholders})`, author),
          )
          .orWhereExists(
            database("playlist_authors")
              .join("authors", "authors.id", "playlist_authors.author_id")
              .select(database.raw("1"))
              .whereRaw("playlist_authors.playlist_id = videos.playlist_id")
              .whereRaw(`authors.name COLLATE NOCASE IN (${placeholders})`, author),
          );
      });
    }
    if (tag?.length) {
      const placeholders = tag.map(() => "?").join(", ");
      queryBuilder.where((where) => {
        where
          .whereRaw(
            `EXISTS (SELECT 1 FROM json_each(videos.tags_json) WHERE value COLLATE NOCASE IN (${placeholders}))`,
            tag,
          )
          .orWhereRaw(
            `EXISTS (SELECT 1 FROM json_each(playlists.tags_json) WHERE value COLLATE NOCASE IN (${placeholders}))`,
            tag,
          );
      });
    }
    if (query) {
      const search = `%${query}%`;
      queryBuilder.where((where) => {
        where
          .whereLike("videos.title", search)
          .orWhereLike("videos.description", search)
          .orWhereLike("videos.tags_json", search)
          .orWhereLike("playlists.title", search)
          .orWhereLike("playlists.description", search)
          .orWhereLike("playlists.tags_json", search)
          .orWhereExists(
            database("video_authors")
              .join("authors", "authors.id", "video_authors.author_id")
              .select(database.raw("1"))
              .whereRaw("video_authors.video_id = videos.id")
              .whereLike("authors.name", search),
          )
          .orWhereExists(
            database("playlist_authors")
              .join("authors", "authors.id", "playlist_authors.author_id")
              .select(database.raw("1"))
              .whereRaw("playlist_authors.playlist_id = videos.playlist_id")
              .whereLike("authors.name", search),
          );
      });
    }
  }

  return {
    async listVideos(filters = {}, pagination) {
      const queryBuilder = createVideosQuery()
        .orderByRaw("videos.playlist_id IS NOT NULL")
        .orderBy("playlists.sort_order")
        .orderBy("videos.sort_order");
      applyVideoFilters(queryBuilder, filters);
      if (pagination) queryBuilder.limit(pagination.limit).offset(pagination.offset);
      return queryBuilder;
    },

    async countVideos(filters = {}) {
      const queryBuilder = database("videos")
        .leftJoin("playlists", "playlists.id", "videos.playlist_id")
        .countDistinct({ video_count: "videos.id" })
        .first();
      applyVideoFilters(queryBuilder, filters);
      const row = (await queryBuilder) as { video_count?: number | string } | undefined;
      return Number(row?.video_count ?? 0);
    },

    listPlaylists({ author } = {}) {
      const queryBuilder = createPlaylistsQuery().orderBy("playlists.sort_order");
      if (author?.length) {
        const placeholders = author.map(() => "?").join(", ");
        queryBuilder.whereExists(
          database("playlist_authors")
            .join("authors", "authors.id", "playlist_authors.author_id")
            .select(database.raw("1"))
            .whereRaw("playlist_authors.playlist_id = playlists.id")
            .whereRaw(`authors.name COLLATE NOCASE IN (${placeholders})`, author),
        );
      }
      return queryBuilder;
    },

    async listAuthors() {
      return database
        .from(
          database
            .select("authors.name", "video_authors.video_id")
            .from("video_authors")
            .join("authors", "authors.id", "video_authors.author_id")
            .unionAll(
              database
                .select("authors.name", "videos.id as video_id")
                .from("playlist_authors")
                .join("authors", "authors.id", "playlist_authors.author_id")
                .join("videos", "videos.playlist_id", "playlist_authors.playlist_id"),
            )
            .as("effective_authors"),
        )
        .select(database.raw("MIN(name) as name"))
        .countDistinct("video_id as video_count")
        .groupByRaw("name COLLATE NOCASE")
        .orderByRaw("name COLLATE NOCASE") as unknown as FilterCountRow[];
    },

    async listTags() {
      return database
        .from(
          database
            .select("video_tag.value as name", "videos.id as video_id")
            .from("videos")
            .joinRaw("JOIN json_each(videos.tags_json) AS video_tag")
            .unionAll(
              database
                .select("playlist_tag.value as name", "videos.id as video_id")
                .from("videos")
                .join("playlists", "playlists.id", "videos.playlist_id")
                .joinRaw("JOIN json_each(playlists.tags_json) AS playlist_tag"),
            )
            .as("effective_tags"),
        )
        .select(database.raw("MIN(name) as name"))
        .countDistinct("video_id as video_count")
        .groupByRaw("name COLLATE NOCASE")
        .orderByRaw("name COLLATE NOCASE") as unknown as FilterCountRow[];
    },

    listContinueWatching() {
      return createVideosQuery()
        .where("progress.position_seconds", ">", 0)
        .where("progress.completed", false)
        .orderBy("progress.updated_at", "desc")
        .limit(12);
    },

    findPlaylist(playlistId) {
      return createPlaylistsQuery().where("playlists.id", playlistId).first();
    },

    listPlaylistVideos(playlistId) {
      return createVideosQuery()
        .where("videos.playlist_id", playlistId)
        .orderBy("videos.sort_order");
    },

    findVideo(videoId) {
      return createVideosQuery().where("videos.id", videoId).first();
    },

    listVideoChapters(videoId) {
      return database<ChapterRow>("chapters")
        .where({ video_id: videoId })
        .orderBy("sort_order")
        .select("id", "video_id", "title", "start_seconds", "sort_order");
    },
  };
}
