# Course

[![Node.js CI](https://github.com/wajeht/course/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/wajeht/course/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Open Source Love svg1](https://badges.frapsoft.com/os/v1/open-source.svg?v=103)](https://github.com/wajeht/course)

A private, opinionated, self-hosted video course library.

> [!WARNING]
> This project is unfinished and heavily work in progress.

## Usage

Run it locally:

```bash
$ docker run --rm \
    --publish 80:80 \
    --env SESSION_SECRET="$(openssl rand -hex 32)" \
    --env AUTH_SETUP_TOKEN="choose-a-one-time-setup-token" \
    --read-only \
    --tmpfs /tmp \
    --cap-drop ALL \
    --cap-add DAC_OVERRIDE \
    --cap-add NET_BIND_SERVICE \
    --security-opt no-new-privileges \
    --device /dev/dri:/dev/dri \
    --volume course-data:/data \
    --volume /path/to/videos:/videos:ro \
    ghcr.io/wajeht/course:latest
```

Then open [localhost](http://localhost).

The published image targets Linux AMD64. `/dev/dri` gives Course access to
Intel Quick Sync when an incompatible video must be re-encoded; CPU fallback
is intentionally disabled. H.264/AAC videos can be played directly or remuxed
without re-encoding.

On the first visit, enter `AUTH_SETUP_TOKEN` and create the application password. The setup token
is ignored after a password exists. `SESSION_SECRET` must remain stable across restarts or existing
sessions will be signed out. Application passwords must contain at least 15 characters. Changing the
password invalidates every other active session.

## Library Layout

```text
/videos/
└── Course Name/
    ├── course.json
    ├── cover.jpg
    ├── 01 - Introduction.mp4
    ├── 01 - Introduction.mp4.json
    └── Module 2/
        ├── 01 - Next lesson.mkv
        └── 01 - Next lesson.mkv.json
```

Videos may be directly inside a course or one folder deeper. Direct videos
appear under **Lessons**. Each first-level folder becomes a named
curriculum section on the course page and in the player sidebar; deeper nesting
is not scanned. Supported files include MP4, M4V, MKV, WebM, MOV, AVI, MPEG,
and MPG. Number prefixes determine natural lesson order and are removed from
display titles.

Course watches the library for changes and updates only the affected course.
Unchanged videos reuse their saved media details instead of running `ffprobe`
again. Startup, manual, and scheduled scans remain as safety checks.

Course metadata is optional:

```json
{
  "version": 1,
  "title": "Course Title",
  "description": "What the course teaches",
  "cover": "cover.jpg",
  "category": "Technology",
  "instructors": ["Jane Smith"],
  "tags": ["Docker", "Kubernetes", "DevOps"],
  "source": {
    "provider": "Course Provider",
    "url": "https://example.com/course"
  }
}
```

`category`, `instructors`, and `tags` supply library filters and are included in
search. Each instructor also gets a page containing all of their courses.
Courses without a category appear under **Uncategorized**. The cover must be a
local JPG, PNG, or WebP. When it is omitted, Course creates a cover from the
first valid video.

Video chapters are optional. Place them in a JSON sidecar whose name is the
video's complete filename plus `.json`. For `01 - Next lesson.mkv`, use
`01 - Next lesson.mkv.json`:

```json
{
  "version": 1,
  "chapters": [
    { "title": "Introduction", "startSeconds": 0 },
    { "title": "First technique", "startSeconds": 416 }
  ]
}
```

Chapter start times use whole seconds, must be in increasing order, and must
fall within the matching video.

## Docs

- See the [DEVELOPMENT GUIDE](./docs/development.md) for local setup, commands, and container usage.
- See the [CONTRIBUTION GUIDE](./docs/contribution.md) before submitting changes.

## License

Distributed under the MIT License © [wajeht](https://github.com/wajeht). See [LICENSE](./LICENSE) for more information.
