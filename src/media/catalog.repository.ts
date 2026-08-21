import { createHash } from "node:crypto";

import type { Knex } from "knex";

import type { CatalogSnapshot, VideoRecord } from "./types.js";

export interface PlaylistOrder {
  id: string;
  sortOrder: number;
}

export interface StoredCatalogEntry {
  path: string;
  type: "playlist" | "video";
}

export interface CatalogCounts {
  playlistCount: number;
  videoCount: number;
}

export interface CatalogRepository {
  synchronizeCatalog(snapshot: CatalogSnapshot): Promise<void>;
  synchronizeEntries(
    snapshot: CatalogSnapshot,
    entryPaths: string[],
    playlistOrder: PlaylistOrder[],
  ): Promise<void>;
  getCatalogEntries(): Promise<StoredCatalogEntry[]>;
  getVideos(entryPaths?: string[]): Promise<VideoRecord[]>;
  getCatalogCounts(): Promise<CatalogCounts>;
}

export function createCatalogRepository(database: Knex): CatalogRepository {
  return {
    async synchronizeCatalog(snapshot) {
      await database.transaction(async (transaction) => {
        await upsertSnapshot(transaction, snapshot);
        await deleteMissingChapters(transaction, snapshot);
        await deleteMissingRecords(transaction, "videos", [
          ...snapshot.videos.map((video) => video.id),
          ...snapshot.skippedVideoIds,
        ]);
        await deleteMissingRecords(
          transaction,
          "playlist_sections",
          snapshot.playlistSections.map((section) => section.id),
        );
        await deleteMissingRecords(
          transaction,
          "playlists",
          snapshot.playlists.map((playlist) => playlist.id),
        );
        await deleteUnusedAuthors(transaction);
      });
    },

    async synchronizeEntries(snapshot, entryPaths, playlistOrder) {
      if (entryPaths.length === 0) return;
      await database.transaction(async (transaction) => {
        await upsertSnapshot(transaction, snapshot);

        for (const playlist of playlistOrder) {
          await transaction("playlists")
            .where({ id: playlist.id })
            .update({ sort_order: playlist.sortOrder });
        }

        await deleteMissingChapters(transaction, snapshot);

        const retainedVideoIds = [
          ...snapshot.videos.map((video) => video.id),
          ...snapshot.skippedVideoIds,
        ];
        const scopedVideos = applyEntryScope(transaction("videos"), entryPaths);
        if (retainedVideoIds.length > 0) await scopedVideos.whereNotIn("id", retainedVideoIds).delete();
        else await scopedVideos.delete();

        const playlistPaths = entryPaths.filter((entryPath) => !entryPath.includes("/"));
        const retainedSectionIds = snapshot.playlistSections.map((section) => section.id);
        const scopedSections = transaction("playlist_sections").whereIn(
          "playlist_id",
          transaction("playlists").select("id").whereIn("path", playlistPaths),
        );
        if (retainedSectionIds.length > 0) {
          await scopedSections.whereNotIn("id", retainedSectionIds).delete();
        } else await scopedSections.delete();

        const retainedPlaylistIds = snapshot.playlists.map((playlist) => playlist.id);
        const scopedPlaylists = transaction("playlists").whereIn("path", playlistPaths);
        if (retainedPlaylistIds.length > 0) {
          await scopedPlaylists.whereNotIn("id", retainedPlaylistIds).delete();
        } else await scopedPlaylists.delete();

        await deleteUnusedAuthors(transaction);
      });
    },

    async getCatalogEntries() {
      const [playlists, standaloneVideos] = await Promise.all([
        database("playlists").select("path"),
        database("videos")
          .leftJoin("playlist_videos", "playlist_videos.video_id", "videos.id")
          .whereNull("playlist_videos.video_id")
          .whereRaw("instr(videos.path, '/') = 0")
          .select("videos.path"),
      ]);
      return [
        ...playlists.map((row) => ({ path: String(row.path), type: "playlist" as const })),
        ...standaloneVideos.map((row) => ({ path: String(row.path), type: "video" as const })),
      ];
    },

    async getVideos(entryPaths) {
      const query = database("videos");
      if (entryPaths) {
        if (entryPaths.length === 0) return [];
        applyEntryScope(query, entryPaths);
      }
      const rows = await query.select();
      return rows.map((row) => ({
        id: String(row.id),
        path: String(row.path),
        title: String(row.title),
        description: String(row.description),
        category: String(row.category),
        authors: [],
        tags: JSON.parse(String(row.tags_json)) as string[],
        coverPath: row.cover_path === null ? null : String(row.cover_path),
        durationSeconds: Number(row.duration_seconds),
        sizeBytes: Number(row.size_bytes),
        container: String(row.container),
        videoCodec: String(row.video_codec),
        audioCodec: row.audio_codec === null ? null : String(row.audio_codec),
        browserCompatible: Boolean(row.browser_compatible),
        modifiedAt: String(row.modified_at),
      }));
    },

    async getCatalogCounts() {
      const [playlists, videos] = await Promise.all([
        database("playlists").count<{ count: number }[]>({ count: "id" }).first(),
        database("videos").count<{ count: number }[]>({ count: "id" }).first(),
      ]);
      return {
        playlistCount: Number(playlists?.count ?? 0),
        videoCount: Number(videos?.count ?? 0),
      };
    },
  };
}

function applyEntryScope(query: Knex.QueryBuilder, entryPaths: string[]): Knex.QueryBuilder {
  return query.where((scope) => {
    for (const entryPath of entryPaths) {
      scope.orWhere("path", entryPath).orWhereLike("path", `${entryPath}/%`);
    }
  });
}

async function upsertSnapshot(
  transaction: Knex.Transaction,
  snapshot: CatalogSnapshot,
): Promise<void> {
  for (const playlist of snapshot.playlists) {
    await transaction("playlists")
      .insert({
        id: playlist.id,
        path: playlist.path,
        title: playlist.title,
        description: playlist.description,
        category: playlist.category,
        tags_json: JSON.stringify(playlist.tags),
        cover_path: playlist.coverPath,
        sort_order: playlist.sortOrder,
      })
      .onConflict("id")
      .merge();
  }

  for (const video of snapshot.videos) {
    const existing = await transaction("videos")
      .where({ id: video.id })
      .select("modified_at", "size_bytes")
      .first();
    if (
      existing &&
      (existing.modified_at !== video.modifiedAt || Number(existing.size_bytes) !== video.sizeBytes)
    ) {
      await transaction("conversions").where({ video_id: video.id }).delete();
    }
    await transaction("videos")
      .insert({
        id: video.id,
        path: video.path,
        title: video.title,
        description: video.description,
        category: video.category,
        tags_json: JSON.stringify(video.tags),
        cover_path: video.coverPath,
        duration_seconds: video.durationSeconds,
        size_bytes: video.sizeBytes,
        container: video.container,
        video_codec: video.videoCodec,
        audio_codec: video.audioCodec,
        browser_compatible: video.browserCompatible,
        modified_at: video.modifiedAt,
      })
      .onConflict("id")
      .merge();
  }

  for (const section of snapshot.playlistSections) {
    await transaction("playlist_sections")
      .insert({
        id: section.id,
        playlist_id: section.playlistId,
        path: section.path,
        title: section.title,
        sort_order: section.sortOrder,
      })
      .onConflict("id")
      .merge();
  }

  for (const membership of snapshot.playlistVideos) {
    await transaction("playlist_videos")
      .insert({
        playlist_id: membership.playlistId,
        video_id: membership.videoId,
        section_id: membership.sectionId,
        sort_order: membership.sortOrder,
      })
      .onConflict(["playlist_id", "video_id"])
      .merge();
  }

  for (const chapter of snapshot.chapters) {
    await transaction("chapters")
      .insert({
        id: chapter.id,
        video_id: chapter.videoId,
        title: chapter.title,
        start_seconds: chapter.startSeconds,
        sort_order: chapter.sortOrder,
      })
      .onConflict("id")
      .merge();
  }

  await synchronizeAuthors(transaction, snapshot);
}

async function synchronizeAuthors(
  transaction: Knex.Transaction,
  snapshot: CatalogSnapshot,
): Promise<void> {
  for (const playlist of snapshot.playlists) {
    await transaction("playlist_authors").where({ playlist_id: playlist.id }).delete();
    for (const [sortOrder, name] of playlist.authors.entries()) {
      const authorId = authorIdentifier(name);
      await transaction("authors").insert({ id: authorId, name }).onConflict("id").merge({ name });
      await transaction("playlist_authors").insert({
        playlist_id: playlist.id,
        author_id: authorId,
        sort_order: sortOrder,
      });
    }
  }

  for (const video of snapshot.videos) {
    await transaction("video_authors").where({ video_id: video.id }).delete();
    for (const [sortOrder, name] of video.authors.entries()) {
      const authorId = authorIdentifier(name);
      await transaction("authors").insert({ id: authorId, name }).onConflict("id").merge({ name });
      await transaction("video_authors").insert({
        video_id: video.id,
        author_id: authorId,
        sort_order: sortOrder,
      });
    }
  }
}

function authorIdentifier(name: string): string {
  return createHash("sha256").update(name.toLocaleLowerCase()).digest("hex").slice(0, 24);
}

async function deleteMissingChapters(
  transaction: Knex.Transaction,
  snapshot: CatalogSnapshot,
): Promise<void> {
  const chapterIdsByVideo = new Map<string, string[]>();
  for (const chapter of snapshot.chapters) {
    const chapterIds = chapterIdsByVideo.get(chapter.videoId) ?? [];
    chapterIds.push(chapter.id);
    chapterIdsByVideo.set(chapter.videoId, chapterIds);
  }

  for (const video of snapshot.videos) {
    const retainedChapterIds = chapterIdsByVideo.get(video.id) ?? [];
    const query = transaction("chapters").where({ video_id: video.id });
    if (retainedChapterIds.length > 0) await query.whereNotIn("id", retainedChapterIds).delete();
    else await query.delete();
  }
}

async function deleteMissingRecords(
  transaction: Knex.Transaction,
  table: "playlists" | "playlist_sections" | "videos",
  ids: string[],
): Promise<void> {
  const query = transaction(table);
  if (ids.length > 0) await query.whereNotIn("id", ids).delete();
  else await query.delete();
}

async function deleteUnusedAuthors(transaction: Knex.Transaction): Promise<void> {
  await transaction("authors")
    .whereNotIn("id", transaction("playlist_authors").select("author_id"))
    .whereNotIn("id", transaction("video_authors").select("author_id"))
    .delete();
}
