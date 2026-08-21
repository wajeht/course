Refactor the local Course repository into a generic self-hosted video library and deliver the complete change as a validated draft pull request.

## Product direction

Build a private, read-only, filesystem-backed video archive with the simple browsing and playback model of YouTube: videos are the primary content and playlists are optional ordered groupings. This is not a YouTube clone. Do not add uploads, file management, comments, likes, subscriptions, recommendations, social features, or transcripts.

Use "Videos" for the visible app name and branding. "Library" remains the main aggregate browsing page. Do not rename the GitHub repository.

The canonical vocabulary everywhere is:

- videos
- playlists
- playlist sections
- authors
- library, as the aggregate browsing concept

Remove course, lesson, instructor, curriculum, and category concepts from code, APIs, routes, UI, tests, fixtures, events, filenames, documentation, and branding.

The app has not been deployed and its database has already been wiped. Make a clean breaking refactor against a fresh, disposable development database. Replace the initial schema directly. Do not add data migrations, legacy aliases, compatibility routes, fallbacks, or duplicated old/new concepts.

## Filesystem source of truth

The filesystem is the sole source of truth. The database is a rebuildable index and must not contain user-managed playlist structure.

```text
/videos/
├── Standalone.mp4
├── Standalone.mp4.json
└── Playlist Name/
    ├── playlist.json
    ├── 01 Introduction.mp4
    └── 02 Section Name/
        └── 01 Technique.mp4
```

- A video directly under `/videos` is standalone.
- A top-level directory is a playlist.
- A video directly inside a playlist belongs to that playlist.
- A one-level child directory inside a playlist is a playlist section.
- A video can belong to at most one playlist and one section because its physical path determines membership.
- Deeper directory nesting is unsupported. Skip it and report a clear scan warning rather than flattening it.
- Do not persist empty playlists or empty sections.
- Natural filename order determines playlist, section, and video order. Direct playlist videos come before section videos. Store one deterministic playlist-wide video order for previous/next playback.
- The normalized relative video path is the video's identity. Moving or renaming a file creates a new video and does not preserve its previous progress or conversion record.
- Full and incremental scans must reconcile the database to the filesystem: add new records, update changed media or metadata, and remove records whose files no longer exist. Preserve the existing handling for invalid or partially copied files.

Do not add database- or UI-managed playlist membership. Metadata may change presentation but never filesystem-derived membership or ordering.

## Metadata

Rename `course.json` to `playlist.json` with no `course.json` fallback.

`playlist.json` supports:

- `version`
- `title`
- `description`
- `cover`
- `authors`
- `tags`
- `source`

Each video may use an adjacent full-filename sidecar such as `Video.mp4.json`. It supports:

- `version`
- `title`
- `description`
- `cover`
- `authors`
- `tags`
- `source`
- timestamped `chapters`

Only `version` is required. Validate metadata strictly, deduplicate authors and tags case-insensitively, and use directory- or filename-derived defaults when optional metadata is absent. Playlist metadata never embeds videos or chapters. Video metadata never controls membership or ordering.

Keep tags as the only flexible classification system. Remove categories instead of maintaining two overlapping taxonomies. Store tags as validated JSON arrays on playlists and videos; do not add tag tables.

Normalize authors into an `authors` table. Author names are case-insensitively unique while preserving display casing. Support ordered authors on both playlists and videos through their respective join tables. Persist optional source provider/URL metadata for both playlists and videos.

For Library search and filtering, a standalone video uses its own authors and tags. A playlist video matches the union of its own authors/tags and its containing playlist's authors/tags. Compute this relationship without copying playlist metadata onto every video record.

Preserve playlist cover discovery and generation. For standalone videos, use the video sidecar's optional cover or generate and cache a cover from that video. Never treat one generic root-level cover file as the cover for every standalone video.

JSON metadata remains the only sidecar format. VTT and transcripts are out of scope.

## Database model

Use these canonical tables:

- `videos`
- `playlists`
- `playlist_sections`
- `authors`
- `playlist_authors`
- `video_authors`
- `chapters`, referencing `video_id`
- `progress`, referencing `video_id`
- `conversions`, referencing `video_id`
- existing settings and authentication tables, renamed internally only where old product branding appears

`videos` owns nullable `playlist_id` and `playlist_section_id` foreign keys plus its deterministic `sort_order`. A standalone video has both playlist fields null. A section video must reference a section owned by the same playlist. Do not add a playlist membership table.

Use clear foreign keys, uniqueness constraints, cascading cleanup, and indexes for the actual query paths. Remove `courses`, `lessons`, `sections`, `course_id`, `lesson_id`, instructor JSON, and category storage.

## Application behavior

Refactor the entire codebase consistently, including:

- schema, repositories, scanner, watcher, metadata readers, warnings, and scan counts
- library services and queries
- Hono API schemas and routes
- playback, conversion, covers, media serving, and progress
- Vue routes, pages, components, composables, query keys, DTOs, labels, states, and player behavior
- tests, fixtures, documentation, README examples, app/package branding, events, and relevant filenames

Use the same video/playlist vocabulary in resources, APIs, and UI. Prefer clear routes instead of retaining catalog/course/lesson mismatches.

- The Library shows all videos, whether standalone or inside a playlist.
- Provide playlist browsing and playlist detail pages.
- Standalone videos open at `/videos/:videoId` without assuming a playlist exists.
- Playlist videos open at `/playlists/:playlistId/videos/:videoId`. Validate membership and retain playlist context through sidebar navigation and previous/next playback.
- Continue Watching remains video-progress based. Resume standalone videos through their video route and playlist videos through their single derived playlist route.
- Replace the course curriculum UI with a playlist sidebar containing its direct videos and sections.

Preserve existing progress, completion, Continue Watching, chapters, direct playback, HLS conversion, retries, Media Session, wake lock, scanner reliability, search, author/tag filters, pagination, authentication, settings, and responsive behavior unless this model requires an intentional adaptation.

Follow existing ownership boundaries and project patterns. Keep the implementation concrete and lean; do not introduce a vague generic media abstraction or speculative playlist features.

## Implementation and delivery

Before editing, inspect `AGENTS.md`, git status, the current schema and control flow, package scripts, and any matching open pull request. Preserve unrelated user changes and work on one focused feature branch.

Implement the refactor comprehensively. Add or update regression coverage, format changed files, run `npm run check`, and run any focused validation warranted by this high-risk change. Resolve failures rather than weakening tests.

Publication is authorized. Stage only intended paths, commit, push, and create or update one matching draft pull request using the applicable GitHub skill. Verify the pushed commits, files, diff, checks, and final PR state. Wait for CI if it is still running. If a genuine product decision is still required, stop and report it rather than guessing.
