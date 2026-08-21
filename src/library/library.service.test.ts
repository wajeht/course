import { beforeEach, describe, expect, it } from "vitest";

import type { Database } from "../db/db.js";
import { createTestDatabase } from "../test/resources.js";
import { createLibraryApiRepository } from "./library.repository.js";
import { createLibraryService } from "./library.service.js";

let database: Database;

const playlistA = "a".repeat(24);
const playlistB = "b".repeat(24);
const videoA = "c".repeat(24);
const videoB = "d".repeat(24);
const standaloneVideo = "e".repeat(24);

beforeEach(async () => {
  database = await createTestDatabase();
  await database.connection("playlists").insert([
    {
      id: playlistA,
      path: "Saved Collection",
      title: "Saved Collection",
      description: "Instructional archive",
      tags_json: JSON.stringify(["Instructional"]),
      sort_order: 0,
    },
    {
      id: playlistB,
      path: "Documentaries",
      title: "Documentaries",
      description: "Long form videos",
      tags_json: JSON.stringify(["Archive"]),
      sort_order: 1,
    },
  ]);
  await database.connection("authors").insert([
    { id: "f".repeat(24), name: "Jane Smith", normalized_name: "jane smith" },
    { id: "1".repeat(24), name: "John Doe", normalized_name: "john doe" },
    { id: "2".repeat(24), name: "Guest", normalized_name: "guest" },
  ]);
  await database.connection("playlist_authors").insert([
    { playlist_id: playlistA, author_id: "f".repeat(24), sort_order: 0 },
    { playlist_id: playlistB, author_id: "1".repeat(24), sort_order: 0 },
  ]);
  await database.connection("videos").insert([
    {
      id: videoA,
      path: "Saved Collection/Video.mp4",
      playlist_id: playlistA,
      title: "Guard Study",
      description: "Frames and retention",
      tags_json: JSON.stringify(["Guard"]),
      sort_order: 0,
      duration_seconds: 100,
      size_bytes: 100,
      container: "mp4",
      video_codec: "h264",
      browser_compatible: true,
      modified_at: "2026-08-21T00:00:00.000Z",
    },
    {
      id: videoB,
      path: "Documentaries/Video.mp4",
      playlist_id: playlistB,
      title: "Documentary",
      description: "A saved film",
      tags_json: "[]",
      sort_order: 0,
      duration_seconds: 200,
      size_bytes: 100,
      container: "mp4",
      video_codec: "h264",
      browser_compatible: true,
      modified_at: "2026-08-21T00:00:00.000Z",
    },
    {
      id: standaloneVideo,
      path: "Song.mp4",
      title: "Standalone Song",
      description: "Saved music video",
      tags_json: JSON.stringify(["Music"]),
      sort_order: 0,
      duration_seconds: 300,
      size_bytes: 100,
      container: "mp4",
      video_codec: "h264",
      browser_compatible: true,
      modified_at: "2026-08-21T00:00:00.000Z",
    },
  ]);
  await database.connection("video_authors").insert([
    { video_id: videoA, author_id: "2".repeat(24), sort_order: 0 },
    { video_id: standaloneVideo, author_id: "f".repeat(24), sort_order: 0 },
  ]);
});

function createService(pageSize = 24) {
  return createLibraryService(createLibraryApiRepository(database.connection), {
    getLibraryPageSize: async () => pageSize,
  });
}

describe("library service", () => {
  it("inherits playlist authors and tags for filtering and presentation", async () => {
    const library = await createService().getLibrary({ author: ["Jane Smith"] });

    expect(library.videos.map((video) => video.title)).toEqual(["Standalone Song", "Guard Study"]);
    expect(library.videos.find((video) => video.id === videoA)).toMatchObject({
      authors: ["Guest", "Jane Smith"],
      tags: ["Guard", "Instructional"],
    });
    expect(library.playlists.map((playlist) => playlist.title)).toEqual(["Saved Collection"]);
    expect(library.authors).toEqual([
      { name: "Guest", videoCount: 1 },
      { name: "Jane Smith", videoCount: 2 },
      { name: "John Doe", videoCount: 1 },
    ]);
    expect(library.tags).toEqual([
      { name: "Archive", videoCount: 1 },
      { name: "Guard", videoCount: 1 },
      { name: "Instructional", videoCount: 1 },
      { name: "Music", videoCount: 1 },
    ]);
  });

  it("searches playlist metadata and filters exact tags", async () => {
    await expect(createService().getLibrary({ query: "Saved Collection" })).resolves.toMatchObject({
      videos: [{ title: "Guard Study" }],
    });
    await expect(createService().getLibrary({ tag: ["Instructional"] })).resolves.toMatchObject({
      videos: [{ title: "Guard Study" }],
    });
    await expect(createService().getLibrary({ tag: ["Instruction"] })).resolves.toMatchObject({
      videos: [],
    });
  });

  it("includes every video by default", async () => {
    const library = await createService().getLibrary();

    expect(library.videos.map((video) => video.id)).toEqual([standaloneVideo, videoA, videoB]);
  });

  it("opens a playlist at its first unfinished video", async () => {
    await database.connection("videos").insert({
      id: "4".repeat(24),
      path: "Saved Collection/Second.mp4",
      playlist_id: playlistA,
      title: "Second lesson",
      sort_order: 1,
      duration_seconds: 100,
      size_bytes: 100,
      container: "mp4",
      video_codec: "h264",
      browser_compatible: true,
      modified_at: "2026-08-21T00:00:00.000Z",
    });
    await database.connection("progress").insert({
      video_id: videoA,
      position_seconds: 100,
      completed: true,
      updated_at: "2026-08-21T00:01:00.000Z",
    });

    const library = await createService().getLibrary();

    expect(library.playlists.find((playlist) => playlist.id === playlistA)?.nextVideoId).toBe(
      "4".repeat(24),
    );
  });

  it("applies search and tag filters to playlists", async () => {
    await expect(createService().getLibrary({ query: "Saved Collection" })).resolves.toMatchObject({
      playlists: [{ title: "Saved Collection" }],
    });
    await expect(createService().getLibrary({ tag: ["Archive"] })).resolves.toMatchObject({
      playlists: [{ title: "Documentaries" }],
    });
    await expect(createService().getLibrary({ tag: ["Instruction"] })).resolves.toMatchObject({
      playlists: [],
    });
  });

  it("paginates all videos using the configured page size", async () => {
    await expect(createService(1).getLibrary({ page: 2 })).resolves.toMatchObject({
      videos: [{ title: "Guard Study" }],
      pagination: { page: 2, pageSize: 1, totalVideos: 3, totalPages: 3 },
    });
  });

  it("lists recent unfinished videos regardless of playlist", async () => {
    await database.connection("progress").insert([
      {
        video_id: videoA,
        position_seconds: 10,
        completed: false,
        updated_at: "2026-08-21T00:01:00.000Z",
      },
      {
        video_id: standaloneVideo,
        position_seconds: 20,
        completed: false,
        updated_at: "2026-08-21T00:02:00.000Z",
      },
    ]);

    const library = await createService().getLibrary();

    expect(library.continueWatching.map((video) => video.id)).toEqual([standaloneVideo, videoA]);
  });

  it("returns chapters and optional playlist context for a video", async () => {
    await database.connection("chapters").insert({
      id: "3".repeat(24),
      video_id: videoA,
      title: "Introduction",
      start_seconds: 0,
      sort_order: 0,
    });

    await expect(createService().getVideo(videoA)).resolves.toMatchObject({
      video: { title: "Guard Study", chapters: [{ title: "Introduction", startSeconds: 0 }] },
      playlist: { title: "Saved Collection", sections: [{ title: "Videos" }] },
    });
    await expect(createService().getVideo(standaloneVideo)).resolves.toMatchObject({
      video: { title: "Standalone Song" },
      playlist: null,
    });
  });
});
