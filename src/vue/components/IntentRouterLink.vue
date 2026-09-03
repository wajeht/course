<script setup lang="ts" generic="TPrefetchResult">
import { RouterLink, type RouteLocationRaw } from "vue-router";

defineOptions({ inheritAttrs: false });

const props = defineProps<{
  prefetch: () => Promise<TPrefetchResult>;
  to: RouteLocationRaw;
}>();

function prefetchRoute(): void {
  void props.prefetch().catch(() => undefined);
}
</script>

<template>
  <RouterLink
    v-bind="$attrs"
    :to="to"
    @pointerenter="prefetchRoute"
    @focus="prefetchRoute"
    @pointerdown="prefetchRoute"
  >
    <slot />
  </RouterLink>
</template>
