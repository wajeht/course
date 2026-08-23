<script setup lang="ts">
import SettingsLayout from "@/pages/settings/partials/SettingsLayout.vue";
import SettingsLibraryRefreshPanel from "@/pages/settings/partials/SettingsLibraryRefreshPanel.vue";
</script>

<template>
  <SettingsLayout>
    <section
      id="settings-library-panel"
      class="grid min-w-0 gap-[clamp(18px,2vw,30px)]"
      aria-labelledby="settings-library-link"
    >
      <SettingsLibraryRefreshPanel />
    </section>
  </SettingsLayout>
</template>
