import { fileURLToPath, URL } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import vue from "@vitejs/plugin-vue";
import { VitePWA } from "vite-plugin-pwa";
import { defineConfig } from "vitest/config";

import { configuration } from "./src/configuration.js";

const projectRoot = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  root: "src/vue",
  publicDir: "public",
  plugins: [
    vue(),
    tailwindcss(),
    VitePWA({
      registerType: "prompt",
      useCredentials: true,
      includeAssets: ["favicon.svg", "apple-touch-icon.png"],
      manifest: {
        id: "/",
        name: "Course",
        short_name: "Course",
        description: "A private, opinionated, self-hosted video course library.",
        theme_color: "#244d3b",
        background_color: "#f5f6f2",
        display: "standalone",
        start_url: "/",
        scope: "/",
        categories: ["education", "productivity"],
        icons: [
          {
            src: "/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        globPatterns: ["**/*.{js,css,html}"],
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [
          /^\/api(?:\/|$)/,
          /^\/covers(?:\/|$)/,
          /^\/healthz$/,
          /^\/hls(?:\/|$)/,
          /^\/media(?:\/|$)/,
        ],
      },
    }),
  ],
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
    copyPublicDir: true,
    emptyOutDir: true,
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
