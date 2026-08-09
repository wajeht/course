import { fileURLToPath, URL } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vitest/config";

import { configuration } from "./src/configuration.js";

const projectRoot = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  root: "src/vue",
  publicDir: fileURLToPath(new URL("./public", import.meta.url)),
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
      "^/api/(catalog|progress|playback|scan)": `http://localhost:${configuration.app.port}`,
      "/covers": `http://localhost:${configuration.app.port}`,
      "/media": `http://localhost:${configuration.app.port}`,
      "/hls": `http://localhost:${configuration.app.port}`,
      "/healthz": `http://localhost:${configuration.app.port}`,
    },
  },
  build: {
    outDir: "../../public",
    copyPublicDir: false,
    emptyOutDir: false,
    sourcemap: true,
  },
  test: {
    root: projectRoot,
    environment: "node",
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
    coverage: {
      reporter: ["text", "json", "html"],
    },
  },
});
