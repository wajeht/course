<script setup lang="ts">
import { RouterLink, type RouteLocationRaw } from "vue-router";

import { useIntentPrefetch } from "@/composables/useIntentPrefetch.js";

defineOptions({ inheritAttrs: false });

const props = defineProps<{
  prefetch: () => unknown;
  to: RouteLocationRaw;
}>();

const intent = useIntentPrefetch(() => {
  void Promise.resolve(props.prefetch()).catch(() => undefined);
});
</script>

<template>
  <RouterLink
    v-bind="$attrs"
    :to="to"
    @pointerenter="intent.schedule"
    @pointerleave="intent.cancel"
    @focus="intent.run"
    @pointerdown="intent.run"
  >
    <slot />
  </RouterLink>
</template>
