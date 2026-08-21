<script setup lang="ts">
import { RouterLink, type RouteLocationRaw } from "vue-router";

import { useIntentPrefetch } from "@/composables/useIntentPrefetch.js";

defineOptions({ inheritAttrs: false });

const props = defineProps<{
  immediate?: boolean;
  prefetch: () => Promise<unknown>;
  to: RouteLocationRaw;
}>();

const intent = useIntentPrefetch(() => {
  void props.prefetch().catch(() => undefined);
});

function handlePointerEnter(): void {
  if (props.immediate) intent.run();
  else intent.schedule();
}

function handlePointerLeave(): void {
  if (!props.immediate) intent.cancel();
}
</script>

<template>
  <RouterLink
    v-bind="$attrs"
    :to="to"
    @pointerenter="handlePointerEnter"
    @pointerleave="handlePointerLeave"
    @focus="intent.run"
    @pointerdown="intent.run"
  >
    <slot />
  </RouterLink>
</template>
