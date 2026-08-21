<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query";
import { computed } from "vue";

import { api, apiErrorMessage } from "@/api.js";
import AlertMessage from "@/components/ui/AlertMessage.vue";
import StandardPageLayout from "@/layouts/StandardPageLayout.vue";
import ContinueWatchingSection from "@/pages/home/partials/ContinueWatchingSection.vue";
import { libraryQueryOptions } from "@/queries.js";

const request = useQuery(libraryQueryOptions({}, api));
const library = computed(() => request.data.value);
const error = computed(() => {
  const caught = request.error.value;
  return caught ? apiErrorMessage(caught, "Could not load your videos") : "";
});
</script>

<template>
  <StandardPageLayout>
    <AlertMessage v-if="error" class="mb-7" size="lg">{{ error }}</AlertMessage>
    <ContinueWatchingSection
      :videos="library?.continueWatching ?? []"
      :loading="request.isPending.value"
    />
  </StandardPageLayout>
</template>
