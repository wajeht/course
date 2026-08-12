<script setup lang="ts">
import { computed } from "vue";
import { RouterLink, useRoute } from "vue-router";

import AppLogo from "@/components/ui/AppLogo.vue";

const route = useRoute();
const activeNavigation = computed(() => route.meta.navigation ?? "library");
const isPlayer = computed(() => route.meta.shell === "player");
</script>

<template>
  <div class="min-h-screen">
    <header
      class="z-40 flex h-[66px] items-center justify-between border-b border-white/12 px-[4vw] text-white max-[860px]:px-[22px]"
      :class="
        isPlayer ? 'relative bg-[#111714]' : 'sticky top-0 bg-pine-deep/[.96] backdrop-blur-[14px]'
      "
    >
      <RouterLink
        to="/"
        class="flex items-center gap-3 font-display text-2xl font-extrabold tracking-[.04em] uppercase"
        aria-label="Course library home"
      >
        <AppLogo text-class="max-[600px]:hidden" />
      </RouterLink>
      <nav class="flex items-center gap-6 max-[600px]:gap-3" aria-label="Main navigation">
        <RouterLink
          to="/"
          class="border-b-2 px-0 py-2 text-[.76rem] font-bold tracking-[.14em] uppercase"
          :class="
            activeNavigation === 'library'
              ? 'border-belt text-white/90'
              : 'border-transparent text-white/55'
          "
        >
          Library
        </RouterLink>
        <RouterLink
          to="/settings"
          class="border-b-2 px-0 py-2 text-[.76rem] font-bold tracking-[.14em] uppercase"
          :class="
            activeNavigation === 'settings'
              ? 'border-belt text-white/90'
              : 'border-transparent text-white/55'
          "
        >
          Settings
        </RouterLink>
      </nav>
    </header>
    <slot />
  </div>
</template>
