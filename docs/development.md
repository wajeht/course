# Development Guide

## Prerequisites

- Node.js 24+
- npm 11+
- FFmpeg and FFprobe
- Intel Quick Sync device access for video conversion

## Local Development

```bash
git clone https://github.com/wajeht/course.git
cd course
cp .env.example .env
npm ci
npx playwright install chromium
npm run db:migrate
npm run dev
```

Open <http://localhost>. Hono listens on port 80 and proxies the development
Vue client running internally on port 3000.

Without `.env`, local commands use `/Volumes/plex/videos` and store the SQLite
database and conversion cache in `./data`. Change those paths in `.env` on
another machine. The video directory itself is never changed.

## Available Commands

```bash
npm run dev           # Start the API and Vue development servers
npm run dev:server    # Start only the API server
npm run dev:client    # Start only the Vue development server
npm run db:migrate    # Apply SQLite migrations
npm run check         # Run types, lint, formatting, tests, and builds
npm run test          # Run tests once
npm run test:pwa      # Test production PWA behavior in Chromium
npm run test:watch    # Run tests in watch mode
npm run build         # Build the server and client
npm start             # Start the production build
```

## Docker Development

Build and start the development stack:

```bash
make up
```

Open <http://localhost>. Source files are bind-mounted into the container, and
the API and Vue development servers reload as files change. The SQLite database
and conversion cache remain under `./data`.

Common commands run inside the development container:

```bash
make test
make format
make lint
make typecheck
make check
make down
```

Run `make help` for the complete command list. `VIDEOS_DIR` defaults to
`/Volumes/plex/videos` on the host and is mounted read-only at `/videos`.

The development Compose file omits hardware device mapping so it works with
Docker Desktop on macOS, where Quick Sync is unavailable. To test conversion on
Linux, use the included device override:

```bash
make up-qsv
```

## Deployment

Pushes to `main` publish the production `Dockerfile` image to
`ghcr.io/wajeht/course`. Production deployment configuration lives in the Home
Ops repository, including video and data mounts, `/dev/dri` access,
`SESSION_SECRET`, `AUTH_SETUP_TOKEN`, and image updates. Course handles browser
authentication itself and exposes `/healthz` without authentication for its
health check.
