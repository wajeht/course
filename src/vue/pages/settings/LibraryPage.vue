<script setup lang="ts">
import SettingsLayout from "@/pages/partials/SettingsLayout.vue";
import SettingsLibraryDisplayPanel from "@/pages/partials/SettingsLibraryDisplayPanel.vue";
import SettingsLibraryRefreshPanel from "@/pages/partials/SettingsLibraryRefreshPanel.vue";
</script>

<template>
  <SettingsLayout>
    <section
      id="settings-library-panel"
      class="col-span-3 grid gap-[clamp(18px,2vw,30px)] max-[1120px]:col-span-2 max-[860px]:col-span-1"
      aria-labelledby="settings-library-link"
    >
      <SettingsLibraryRefreshPanel />
      <SettingsLibraryDisplayPanel />
    </section>
  </SettingsLayout>
</template>
