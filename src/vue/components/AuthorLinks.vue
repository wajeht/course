<script setup lang="ts">
import IntentRouterLink from "@/components/IntentRouterLink.vue";
import { useRoutePrefetch } from "@/composables/useRoutePrefetch.js";

defineOptions({ inheritAttrs: false });
defineProps<{ authors: readonly string[] }>();

const prefetch = useRoutePrefetch();
</script>

<template>
  <span v-bind="$attrs">
    <template v-for="(author, index) in authors" :key="author">
      <span v-if="index">, </span>
      <IntentRouterLink
        :to="{ name: 'author', params: { authorName: author } }"
        :prefetch="() => prefetch.author(author)"
        class="hover:underline"
      >
        {{ author }}
      </IntentRouterLink>
    </template>
  </span>
</template>
