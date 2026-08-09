# Minimal Video Course Platform

## Summary

Build a responsive, light Udemy-style web app for one user. It scans `/videos`, organizes courses automatically, streams videos remotely, and synchronizes progress across devices.

## Application

- Use TypeScript throughout on the current Node.js LTS release.
- Run a JSON API with Hono through `@hono/node-server`; do not use Inertia.
- Build a separate Vue 3 single-page client with Vue Router, Vite, and Tailwind CSS through `@tailwindcss/vite`.
- Keep server and client in the same repository and production container. Hono serves the compiled Vue application and its hashed assets in production.
- Define request/response validation with Zod and export the Hono app type; the Vue API module uses Hono's typed `hc` client so routes and payloads stay type-safe without generated code.
- Support current Chrome, Firefox, and Safari on desktop and mobile.
- Store application data in SQLite using Knex.js with its `better-sqlite3` client; use typed repository modules and Knex migrations.
- Use Knex rather than Drizzle to match the established Bang and Calendar database patterns; Zod remains responsible for runtime validation.
- Home page:
  - Continue Watching row.
  - Search courses and lesson titles.
  - Course grid with cover, title, and completion percentage.
- Course page:
  - Description, cover, progress, sections, lesson durations, and completion state.
- Player page:
  - Resume automatically.
  - Playback-speed control.
  - Lesson sidebar.
  - Next Lesson button after playback finishes.
  - Lesson and course progress reset controls.
- A lesson completes only when the video reaches its end.

## Reference Architecture

- Follow Close Powerlifting's Hono lifecycle split: `src/app.ts` builds the app, `src/server.ts` owns startup and graceful shutdown, `src/context.ts` constructs dependencies, and `src/routes/routes.ts` mounts feature routers.
- Organize each server feature under `src/routes/api/<feature>/` with `<feature>.ts`, `<feature>.service.ts`, `<feature>.repository.ts`, `<feature>.schema.ts`, and colocated tests. Route modules handle HTTP, services handle behavior, and repositories contain Knex queries.
- Keep shared Hono middleware in `src/routes/middleware.ts`, including request IDs, structured request logging, secure headers, errors, not-found responses, and cache policy. OAuth remains handled by Traefik.
- Follow Calendar's client separation under `src/vue/`: use `App.vue` and `main.ts` for startup, `pages/` for routed views, `layouts/` for shared shells, `components/` for reusable UI, `router/` for Vue Router, `api/` for the typed Hono client, and `assets/tailwind.css` for Tailwind input.
- Configure Vite with `src/vue` as its root and output production files to `dist/client`. During development, run Vite and Hono together and proxy `/api`, `/media`, `/hls`, and `/healthz` to Hono.
- In production, Hono serves `dist/client`: `index.html` uses `no-cache`, hashed assets use a one-year immutable cache, and non-API browser routes fall back to `index.html` for Vue Router.
- Keep scanning and Quick Sync conversion outside route handlers in dedicated `src/media/` services so HTTP routes only start jobs and report status.
- Follow Bang's database layout with `src/db/db.ts`, `src/db/knexfile.ts`, `src/db/migration-source.ts`, and timestamped TypeScript files in `src/db/migrations/`.
- Configure Knex with `client: "better-sqlite3"`, foreign keys, WAL mode, `synchronous=NORMAL`, a busy timeout, and a single connection (`min: 0`, `max: 1`). Use modest cache settings appropriate for this app rather than Bang's larger values.
- Run pending Knex migrations before accepting HTTP traffic. Resolve TypeScript migrations in development and compiled JavaScript migrations in production, following Bang's custom migration-source pattern.
- Use an in-memory SQLite database for tests and real Knex queries instead of mocking repositories.

## Files and Scanning

```text
/videos/
  Course Name/
    course.json
    cover.jpg
    01 - Introduction.mp4
    Section Name/
      01 - Lesson.mkv
```

- Support videos directly inside a course or one level of section folders.
- Scan at startup, every five minutes, and through a Rescan button.
- Natural-sort numbered filenames and clean number prefixes for display.
- Recognize common video formats using FFprobe, including MP4, M4V, MKV, WebM, MOV, AVI, MPEG, and MPG.
- Mount `/videos` read-only; no upload, rename, move, or delete controls.
- Invalid or partially copied videos are skipped, reported in scan status, and retried later.
- Renamed files are treated as new lessons.

Optional `course.json`:

```json
{
  "version": 1,
  "title": "Course Title",
  "description": "Course description",
  "cover": "cover.jpg"
}
```

- JSON only overrides course-level details.
- Without JSON, use the course folder name.
- Accept local JPG, PNG, or WebP covers.
- Without a cover, generate one from the first video.
- Invalid JSON produces a warning and falls back to inferred metadata.

## Streaming and Data

- Direct-stream browser-compatible videos with byte-range support for seeking.
- On first play, convert incompatible videos to cached HLS using FFmpeg.
- Play HLS natively in Safari and use `hls.js` in Chrome and Firefox.
- Preserve source resolution; do not cap at 1080p or generate adaptive qualities.
- Remux compatible streams when possible; otherwise convert to H.264/AAC.
- Use Intel Quick Sync through `/dev/dri`; never fall back to CPU transcoding.
- Show conversion progress and begin playback once initial HLS segments exist.
- Keep converted files indefinitely and never modify originals.
- Run at most one conversion at a time and prevent duplicate jobs for the same lesson.
- If Quick Sync is unavailable or conversion fails, show a clear error and leave the original untouched.
- Provide a Retry Conversion button after a failed conversion.
- Save playback position every ten seconds and on pause, navigation, or tab close.
- SQLite stores catalog metadata, playback position, completion, and recent activity.
- Progress is one global profile; OAuth is only the external access gate.
- Provide internal endpoints for catalog/search, progress updates and resets, rescanning, conversion status, ranged media, HLS segments, and `/healthz`.

## Delivery and Verification

- Create private `wajeht/course` GitHub repository.
- GitHub Actions runs TypeScript checks, Node/Vue tests, linting, formatting checks, Vite production builds, and publishes `ghcr.io/wajeht/course:<commit>`.
- Add Home Ops deployment using:
  - `https://course.jaw.dev`
  - `oauth2-media@file`
  - `/home/jaw/plex/videos:/videos:ro`
  - `/home/jaw/data/course:/data`
  - `/dev/dri` for hardware conversion
  - Existing Traefik, security, health-check, logging, image-pinning, and Docker CD conventions.
- Test scanner fallback and ordering, JSON handling, progress/resume/reset, search, range requests, path traversal protection, single-job conversion, deduplication, and Quick Sync failure recovery without CPU fallback.
- Verify current desktop and mobile Chrome, Firefox, and Safari; OAuth protection; direct MP4/WebM playback; native and `hls.js` HLS playback; MKV conversion and retry; seeking; progress persistence; rescanning; and container restart recovery.

## Assumptions

- No subtitles, notes, categories, multi-user accounts, adaptive streaming, or filesystem management.
- Course artwork is supplied locally; the app does not scrape course providers.
- Course completion equals all lessons reaching their end.
- Video cache cleanup is manual through the server filesystem.
