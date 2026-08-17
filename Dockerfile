FROM node:24-bookworm-slim@sha256:3638d9a6fe4030bd716be989438248074489337ba3275657f93595428be4fc03 AS build

ARG APP_VERSION

WORKDIR /app

RUN apt-get update \
  && apt-get install --yes --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.base.json tsconfig.json tsconfig.server.json tsconfig.client.json tsconfig.pwa.json vite.config.ts ./
COPY src ./src
COPY public ./public
RUN npm run build \
  && npm prune --omit=dev

FROM node:24-bookworm-slim@sha256:3638d9a6fe4030bd716be989438248074489337ba3275657f93595428be4fc03 AS runtime

ENV APP_ENV=production \
  APP_HOST=0.0.0.0 \
  APP_PORT=80 \
  VIDEOS_DIR=/videos \
  DATA_DIR=/data \
  QSV_DEVICE=/dev/dri/renderD128

WORKDIR /app

RUN sed -i 's/Components: main/Components: main contrib non-free non-free-firmware/' /etc/apt/sources.list.d/debian.sources \
  && apt-get update \
  && apt-get install --yes --no-install-recommends ca-certificates ffmpeg tini \
  && if [ "$(dpkg --print-architecture)" = "amd64" ]; then \
    apt-get install --yes --no-install-recommends intel-media-va-driver-non-free; \
  fi \
  && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

VOLUME ["/data", "/videos"]
EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:80/healthz').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"]

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["npm", "start"]
