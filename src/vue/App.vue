<script setup lang="ts">
import { RouterView } from "vue-router";

import PwaUpdatePrompt from "./components/PwaUpdatePrompt.vue";
import AppShell from "./layouts/AppShell.vue";
</script>

<template>
  <AppShell>
    <RouterView />
  </AppShell>
  <PwaUpdatePrompt />
</template>
