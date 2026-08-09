<script setup lang="ts">
import { computed } from "vue";
import { RouterLink, useRoute } from "vue-router";

const route = useRoute();
const isPlayer = computed(() => route.name === "player");
</script>

<template>
  <div class="app-shell" :class="{ 'app-shell--player': isPlayer }">
    <header class="site-header">
      <RouterLink to="/" class="brand" aria-label="Course library home">
        <span class="brand__mark" aria-hidden="true"><i /><i /><i /></span>
        <span>Course</span>
      </RouterLink>
      <RouterLink to="/" class="header-link">Library</RouterLink>
    </header>
    <slot />
  </div>
</template>
