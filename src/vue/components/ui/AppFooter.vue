<script setup lang="ts">
const appVersion = __APP_VERSION__;
</script>

<template>
  <footer class="text-center text-xs font-medium tracking-[0.04em] text-muted">
    © 2026 ·
    <a
      class="font-semibold text-pine underline-offset-4 hover:underline"
      href="https://github.com/wajeht/course"
      target="_blank"
      rel="noreferrer"
      aria-label="Course repository on GitHub (opens in a new tab)"
      >GitHub</a
    >
    ·
    <a
      class="font-semibold text-pine underline-offset-4 hover:underline"
      :href="`https://github.com/wajeht/course/releases/tag/v${appVersion}`"
      target="_blank"
      rel="noreferrer"
      aria-label="Course repository changelog on GitHub (opens in a new tab)"
      >v{{ appVersion }}
    </a>
  </footer>
</template>
