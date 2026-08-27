<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";

import IntentRouterLink from "@/components/IntentRouterLink.vue";
import PanelCard from "@/components/ui/PanelCard.vue";
import { useRoutePrefetch } from "@/composables/useRoutePrefetch.js";

const route = useRoute();
const prefetch = useRoutePrefetch();
const settingsSections = [
  {
    label: "Library",
    prefetch: prefetch.settingsLibrary,
    routeName: "settings-library",
    value: "library",
  },
  {
    label: "Access",
    prefetch: prefetch.settingsAccess,
    routeName: "settings-access",
    value: "access",
  },
] as const;
const sections = computed(() =>
  settingsSections.map((section) => {
    if (route.name === section.routeName) {
      return {
        ...section,
        stateClasses: "bg-pine! text-white!",
      };
    }
    return {
      ...section,
      stateClasses: "bg-transparent! text-pine! hover:bg-porcelain!",
    };
  }),
);
</script>

<template>
  <PanelCard
    as="nav"
    class="p-6 max-[760px]:rounded-[8px] max-[760px]:p-1"
    :elevated="false"
    padding="none"
    aria-label="Settings sections"
  >
    <div class="grid gap-1 max-[760px]:grid-cols-2">
      <IntentRouterLink
        v-for="section in sections"
        :id="`settings-${section.value}-link`"
        :key="section.value"
        :to="{ name: section.routeName }"
        :prefetch="section.prefetch"
        :class="[
          'flex h-10 w-full items-center rounded-[7px] px-3.5 text-left text-[.82rem] font-bold transition-[background,color] duration-[160ms] max-[760px]:justify-center max-[760px]:px-0',
          section.stateClasses,
        ]"
        :aria-controls="`settings-${section.value}-panel`"
      >
        <span>{{ section.label }}</span>
      </IntentRouterLink>
    </div>
  </PanelCard>
</template>
