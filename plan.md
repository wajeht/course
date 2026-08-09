# Minimal Video Course Platform

## Summary

Build a responsive, light Udemy-style web app for one user. It scans `/videos`, organizes courses automatically, streams videos remotely, and synchronizes progress across devices.

## Application

- Single Go 1.26 application with embedded HTML, CSS, JavaScript, and SQLite.
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
- Preserve source resolution; do not cap at 1080p or generate adaptive qualities.
- Remux compatible streams when possible; otherwise convert to H.264/AAC.
- Use Intel Quick Sync through `/dev/dri`; never fall back to CPU transcoding.
- Show conversion progress and begin playback once initial HLS segments exist.
- Keep converted files indefinitely and never modify originals.
- Run at most one conversion at a time and prevent duplicate jobs for the same lesson.
- If Quick Sync is unavailable or conversion fails, show a clear error and leave the original untouched.
- Save playback position every ten seconds and on pause, navigation, or tab close.
- SQLite stores catalog metadata, playback position, completion, and recent activity.
- Progress is one global profile; OAuth is only the external access gate.
- Provide internal endpoints for catalog/search, progress updates and resets, rescanning, conversion status, ranged media, HLS segments, and `/healthz`.

## Delivery and Verification

- Create private `wajeht/course` GitHub repository.
- GitHub Actions runs Go tests, formatting checks, container builds, and publishes `ghcr.io/wajeht/course:<commit>`.
- Add Home Ops deployment using:
  - `https://course.jaw.dev`
  - `oauth2-media@file`
  - `/home/jaw/plex/videos:/videos:ro`
  - `/home/jaw/data/course:/data`
  - `/dev/dri` for hardware conversion
  - Existing Traefik, security, health-check, logging, image-pinning, and Docker CD conventions.
- Test scanner fallback and ordering, JSON handling, progress/resume/reset, search, range requests, path traversal protection, single-job conversion, deduplication, and Quick Sync failure recovery without CPU fallback.
- Verify desktop and mobile layouts, OAuth protection, direct MP4/WebM playback, MKV conversion, seeking, progress persistence, rescanning, and container restart recovery.

## Assumptions

- No subtitles, notes, categories, multi-user accounts, adaptive streaming, or filesystem management.
- Course artwork is supplied locally; the app does not scrape course providers.
- Course completion equals all lessons reaching their end.
- Video cache cleanup is manual through the server filesystem.
