import { readFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vitest/config";

import { configuration } from "./src/configuration.js";

const projectRoot = fileURLToPath(new URL(".", import.meta.url));
const { version } = JSON.parse(
  readFileSync(new URL("./package.json", import.meta.url), "utf8"),
) as { version: string };
const appVersion = (process.env.APP_VERSION?.trim() || version).replace(/^v/, "");

export default defineConfig({
  root: "src/vue",
  publicDir: fileURLToPath(new URL("./public", import.meta.url)),
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src/vue", import.meta.url)),
    },
  },
  server: {
    host: true,
    port: configuration.app.vuePort,
    strictPort: true,
    hmr: {
      clientPort: configuration.app.vuePort,
    },
    proxy: {
      "^/api/(auth|catalog|progress|playback|scan|settings)": `http://localhost:${configuration.app.port}`,
      "/covers": `http://localhost:${configuration.app.port}`,
      "/media": `http://localhost:${configuration.app.port}`,
      "/hls": `http://localhost:${configuration.app.port}`,
      "/healthz": `http://localhost:${configuration.app.port}`,
    },
  },
  build: {
    outDir: "../../dist/client",
    copyPublicDir: true,
    emptyOutDir: true,
    sourcemap: true,
  },
  test: {
    root: projectRoot,
    coverage: {
      reporter: ["text", "json", "html"],
    },
    projects: [
      {
        extends: true,
        test: {
          name: "server",
          environment: "node",
          include: ["src/**/*.test.ts"],
          exclude: ["src/vue/**/*.test.ts"],
          setupFiles: ["src/test/setup.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "client",
          environment: "happy-dom",
          include: ["src/vue/**/*.test.ts"],
          setupFiles: ["src/vue/test/setup.ts"],
        },
      },
    ],
  },
});
