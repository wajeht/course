<script setup lang="ts">
import { onMounted } from "vue";
import { RouterLink } from "vue-router";

import AppButton from "@/components/ui/AppButton.vue";
import AppIcon from "@/components/ui/AppIcon.vue";
import EmptyState from "@/components/ui/EmptyState.vue";
import { retryFrontend } from "@/frontend-error.js";
import { setPageTitle } from "@/utils.js";

onMounted(() => setPageTitle("Unexpected error"));
</script>

<template>
  <main
    class="mx-auto grid min-h-screen w-[min(1380px,calc(100%-8vw))] place-items-center max-[860px]:w-[min(100%-40px,1380px)]"
  >
    <EmptyState
      title="Something went wrong"
      description="This page could not be opened. Reload it to try again."
      :heading-level="1"
      :framed="false"
    >
      <template #icon><AppIcon name="alert-circle" class="size-12" /></template>
      <template #actions>
        <AppButton size="lg" @click="retryFrontend">Reload page</AppButton>
        <AppButton :as="RouterLink" to="/" variant="secondary" size="lg">Go home</AppButton>
      </template>
    </EmptyState>
  </main>
</template>
