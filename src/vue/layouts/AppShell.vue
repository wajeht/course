<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";

import IntentRouterLink from "@/components/IntentRouterLink.vue";
import AppLogo from "@/components/ui/AppLogo.vue";
import { useRoutePrefetch } from "@/composables/useRoutePrefetch.js";

const route = useRoute();
const prefetch = useRoutePrefetch();
const activeNavigation = computed(() => route.meta.navigation);
const isPlayer = computed(() => route.meta.shell === "player");
</script>

<template>
  <div
    class="min-h-screen max-[600px]:pb-[calc(68px+env(safe-area-inset-bottom))]"
    :class="isPlayer ? 'max-[600px]:bg-[#111714]' : ''"
  >
    <header
      class="z-40 flex h-[calc(66px+env(safe-area-inset-top))] items-center justify-between border-b border-white/12 px-[4vw] pt-[env(safe-area-inset-top)] text-white max-[860px]:px-[22px]"
      :class="
        isPlayer ? 'relative bg-[#111714]' : 'sticky top-0 bg-pine-deep/[.96] backdrop-blur-[14px]'
      "
    >
      <IntentRouterLink
        to="/"
        :prefetch="prefetch.home"
        class="flex items-center gap-3 font-display text-2xl font-extrabold tracking-[.04em] uppercase"
        aria-label="Course home"
      >
        <AppLogo />
      </IntentRouterLink>
      <nav class="flex items-center gap-6 max-[600px]:hidden" aria-label="Main navigation">
        <IntentRouterLink
          to="/"
          :prefetch="prefetch.home"
          class="border-b-2 px-0 py-2 text-[.76rem] font-bold tracking-[.14em] uppercase"
          :class="
            activeNavigation === 'home'
              ? 'border-belt text-white/90'
              : 'border-transparent text-white/55'
          "
        >
          Home
        </IntentRouterLink>
        <IntentRouterLink
          to="/library"
          :prefetch="prefetch.library"
          class="border-b-2 px-0 py-2 text-[.76rem] font-bold tracking-[.14em] uppercase"
          :class="
            activeNavigation === 'library'
              ? 'border-belt text-white/90'
              : 'border-transparent text-white/55'
          "
        >
          Library
        </IntentRouterLink>
        <IntentRouterLink
          to="/settings/library"
          :prefetch="prefetch.settingsLibrary"
          class="border-b-2 px-0 py-2 text-[.76rem] font-bold tracking-[.14em] uppercase"
          :class="
            activeNavigation === 'settings'
              ? 'border-belt text-white/90'
              : 'border-transparent text-white/55'
          "
        >
          Settings
        </IntentRouterLink>
      </nav>
    </header>
    <slot />
    <nav
      class="fixed right-0 bottom-0 left-0 z-50 hidden border-t border-white/12 bg-pine-deep/[.98] px-3 pt-1.5 pb-[max(6px,env(safe-area-inset-bottom))] text-white shadow-[0_-12px_35px_rgb(10_25_18_/_18%)] backdrop-blur-[14px] max-[600px]:grid max-[600px]:grid-cols-3"
      aria-label="Mobile navigation"
    >
      <IntentRouterLink
        to="/"
        :prefetch="prefetch.home"
        class="relative flex min-h-[56px] items-center justify-center rounded-[8px] text-[.7rem] font-bold tracking-[.1em] uppercase"
        :class="activeNavigation === 'home' ? 'text-belt-light' : 'text-white/55'"
        :aria-current="activeNavigation === 'home' ? 'page' : undefined"
      >
        <span
          class="absolute top-0 h-[3px] w-8 rounded-full bg-belt-light transition-opacity"
          :class="activeNavigation === 'home' ? 'opacity-100' : 'opacity-0'"
          aria-hidden="true"
        />
        Home
      </IntentRouterLink>
      <IntentRouterLink
        to="/library"
        :prefetch="prefetch.library"
        class="relative flex min-h-[56px] items-center justify-center rounded-[8px] text-[.7rem] font-bold tracking-[.1em] uppercase"
        :class="activeNavigation === 'library' ? 'text-belt-light' : 'text-white/55'"
        :aria-current="activeNavigation === 'library' ? 'page' : undefined"
      >
        <span
          class="absolute top-0 h-[3px] w-8 rounded-full bg-belt-light transition-opacity"
          :class="activeNavigation === 'library' ? 'opacity-100' : 'opacity-0'"
          aria-hidden="true"
        />
        Library
      </IntentRouterLink>
      <IntentRouterLink
        to="/settings/library"
        :prefetch="prefetch.settingsLibrary"
        class="relative flex min-h-[56px] items-center justify-center rounded-[8px] text-[.7rem] font-bold tracking-[.1em] uppercase"
        :class="activeNavigation === 'settings' ? 'text-belt-light' : 'text-white/55'"
        :aria-current="activeNavigation === 'settings' ? 'page' : undefined"
      >
        <span
          class="absolute top-0 h-[3px] w-8 rounded-full bg-belt-light transition-opacity"
          :class="activeNavigation === 'settings' ? 'opacity-100' : 'opacity-0'"
          aria-hidden="true"
        />
        Settings
      </IntentRouterLink>
    </nav>
  </div>
</template>
