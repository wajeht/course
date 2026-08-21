<script setup lang="ts">
import SettingsAccessPanel from "@/pages/settings/partials/SettingsAccessPanel.vue";
import SettingsLayout from "@/pages/settings/partials/SettingsLayout.vue";
</script>

<template>
  <SettingsLayout>
    <section id="settings-access-panel" class="min-w-0" aria-labelledby="settings-access-link">
      <SettingsAccessPanel />
    </section>
  </SettingsLayout>
</template>
