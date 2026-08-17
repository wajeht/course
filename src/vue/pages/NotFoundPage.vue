<script setup lang="ts">
import { RouterLink } from "vue-router";

import AppButton from "@/components/ui/AppButton.vue";
import EmptyState from "@/components/ui/EmptyState.vue";
</script>

<template>
  <main
    class="mx-auto grid min-h-[calc(100vh-66px)] w-[min(1380px,calc(100%-8vw))] place-items-center max-[860px]:w-[min(100%-40px,1380px)]"
  >
    <EmptyState
      title="Page not found"
      description="The address may be wrong, or the page may have moved."
      :heading-level="1"
      :framed="false"
    >
      <template #icon>404</template>
      <template #actions>
        <AppButton :as="RouterLink" to="/" size="lg">Go home</AppButton>
        <AppButton :as="RouterLink" to="/library" variant="secondary" size="lg">
          Browse library
        </AppButton>
      </template>
    </EmptyState>
  </main>
</template>
