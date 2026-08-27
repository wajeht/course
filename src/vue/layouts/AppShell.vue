<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";

import AppPrimaryNavigation from "@/layouts/partials/AppPrimaryNavigation.vue";

const route = useRoute();
const activeNavigation = computed(() => route.meta.navigation);
const isPlayer = computed(() => route.meta.shell === "player");
</script>

<template>
  <div
    class="min-h-screen max-[600px]:pb-[calc(68px+env(safe-area-inset-bottom))]"
    :class="[
      isPlayer ? 'max-[600px]:bg-[#12161c] max-[600px]:pb-0' : '',
      'min-[1024px]:pl-[168px]',
    ]"
  >
    <AppPrimaryNavigation :active-navigation="activeNavigation" :player="isPlayer" />
    <slot />
  </div>
</template>
