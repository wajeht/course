# Course

[![Node.js CI](https://github.com/wajeht/course/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/wajeht/course/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Open Source Love svg1](https://badges.frapsoft.com/os/v1/open-source.svg?v=103)](https://github.com/wajeht/course)

A private, opinionated, self-hosted video course library.

## Library Layout

```text
/videos/
  Course Name/
    course.json
    cover.jpg
    01 - Introduction.mp4
    Module 2/
      01 - Next lesson.mkv
```

Videos may be directly inside a course or one folder deeper. Direct videos
appear under **Course lessons**. Each first-level folder becomes a named
curriculum section on the course page and in the player sidebar; deeper nesting
is not scanned. Supported files include MP4, M4V, MKV, WebM, MOV, AVI, MPEG,
and MPG. Number prefixes determine natural lesson order and are removed from
display titles.

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

## Docs

- See the [DEVELOPMENT GUIDE](./docs/development.md) for local setup, commands, and container usage.
- See the [CONTRIBUTION GUIDE](./docs/contribution.md) before submitting changes.

## License

Distributed under the MIT License © [wajeht](https://github.com/wajeht). See [LICENSE](./LICENSE) for more information.
