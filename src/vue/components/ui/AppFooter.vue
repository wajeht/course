<script setup lang="ts">
import AppIcon from "./AppIcon.vue";

const appVersion = __APP_VERSION__;
</script>

<template>
  <footer class="text-center text-xs font-medium tracking-[0.04em] text-muted">
    © 2026 · Made with
    <span class="sr-only">love</span>
    <AppIcon name="heart" class="mx-0.5 inline-block size-4 align-[-0.2em] text-clay" />
    by
    <a
      class="font-semibold text-pine underline-offset-4 hover:underline"
      href="https://github.com/wajeht"
      target="_blank"
      rel="noreferrer"
      aria-label="App author on GitHub (opens in a new tab)"
      >@wajeht</a
    >
    .
    <a
      class="font-semibold text-pine underline-offset-4 hover:underline"
      :href="`https://github.com/wajeht/course/releases/tag/v${appVersion}`"
      target="_blank"
      rel="noreferrer"
      :aria-label="`View release v${appVersion} on GitHub (opens in a new tab)`"
      >v{{ appVersion }}
    </a>
  </footer>
</template>
