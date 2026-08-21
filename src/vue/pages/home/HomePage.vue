<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query";
import { computed } from "vue";

import { api, apiErrorMessage } from "@/api.js";
import ContinueWatchingSection from "@/pages/home/partials/ContinueWatchingSection.vue";
import AlertMessage from "@/components/ui/AlertMessage.vue";
import StandardPageLayout from "@/layouts/StandardPageLayout.vue";
import { catalogQueryOptions } from "@/queries.js";

const catalogRequest = useQuery(catalogQueryOptions({}, api));
const continueWatching = computed(() => catalogRequest.data.value?.continueWatching ?? []);
const error = computed(() => {
  const caught = catalogRequest.error.value;
  return caught ? apiErrorMessage(caught, "Could not load your courses") : "";
});
</script>

<template>
  <StandardPageLayout>
    <AlertMessage v-if="error" class="mb-7" size="lg">
      {{ error }}
    </AlertMessage>

    <ContinueWatchingSection
      :lessons="continueWatching"
      :loading="catalogRequest.isPending.value"
    />
  </StandardPageLayout>
</template>
