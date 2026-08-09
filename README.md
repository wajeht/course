# Course

A private, self-hosted video course library. It scans a read-only video folder,
streams browser-compatible files directly, converts other files to cached HLS
with Intel Quick Sync, and keeps one profile's viewing progress in SQLite.

## Library layout

```text
/videos/
  Course Name/
    course.json
    cover.jpg
    01 - Introduction.mp4
    Volume 2/
      01 - Next lesson.mkv
```

Videos may be directly inside a course or one folder deeper. Supported files
include MP4, M4V, MKV, WebM, MOV, AVI, MPEG, and MPG. Number prefixes determine
natural lesson order and are removed from display titles.

Course metadata is optional:

```json
{
  "version": 1,
  "title": "Course Title",
  "description": "What the course teaches",
  "cover": "cover.jpg"
}
```

The cover must be a local JPG, PNG, or WebP. When it is omitted, Course creates
a cover from the first valid video.

## Local development

Requirements: Node.js 24+, FFmpeg/FFprobe, and npm 11+.

```bash
cp .env.example .env
npm ci
npm run db:migrate
npm run dev
```

Hono runs at `http://localhost` and proxies the development Vue client running
internally on port 3000, so there is one browser URL. Without `.env`, local commands use
`/Volumes/plex/videos` and store the database/cache in `./data`. Change those
paths in `.env` on another machine. The video directory itself is never changed.

Useful commands:

```bash
npm run check
npm run build
npm start
```

## Container

```bash
docker compose up --build
```

The example mounts `/home/jaw/plex/videos` read-only and persists the catalog,
progress, generated covers, and HLS cache under `/home/jaw/data/course`.
`/dev/dri` is required for Quick Sync. Course deliberately does not fall back
to CPU transcoding when hardware conversion is unavailable.

OAuth is expected to run at the reverse proxy. Course itself exposes no public
authentication layer. Its health endpoint is `/healthz`.
