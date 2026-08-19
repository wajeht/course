<script setup lang="ts">
import SettingsAccessPanel from "@/pages/partials/SettingsAccessPanel.vue";
import SettingsLayout from "@/pages/partials/SettingsLayout.vue";
</script>

<template>
  <SettingsLayout>
    <section
      id="settings-access-panel"
      class="col-span-3 max-[1120px]:col-span-2 max-[860px]:col-span-1"
      aria-labelledby="settings-access-link"
    >
      <SettingsAccessPanel />
    </section>
  </SettingsLayout>
</template>
