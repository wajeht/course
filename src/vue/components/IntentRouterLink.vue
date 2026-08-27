<script setup lang="ts">
import { RouterLink, type RouteLocationRaw } from "vue-router";

import { useIntentPrefetch } from "@/composables/useIntentPrefetch.js";

defineOptions({ inheritAttrs: false });

const props = defineProps<{
  prefetch: () => Promise<void>;
  to: RouteLocationRaw;
}>();

const intent = useIntentPrefetch(() => {
  void props.prefetch().catch(() => undefined);
});
</script>

<template>
  <RouterLink
    v-bind="$attrs"
    :to="to"
    @pointerenter="intent.run"
    @focus="intent.run"
    @pointerdown="intent.run"
  >
    <slot />
  </RouterLink>
</template>
