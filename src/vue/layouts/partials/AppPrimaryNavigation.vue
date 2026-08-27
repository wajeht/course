<script setup lang="ts">
import type { RouteLocationRaw } from "vue-router";

import IntentRouterLink from "@/components/IntentRouterLink.vue";
import AppLogo from "@/components/ui/AppLogo.vue";
import { useNetworkStatus } from "@/composables/useNetworkStatus.js";
import { useRoutePrefetch } from "@/composables/useRoutePrefetch.js";

type NavigationValue = "home" | "settings" | "videos";

defineProps<{
  activeNavigation?: NavigationValue;
  player: boolean;
}>();

const prefetch = useRoutePrefetch();
const { online } = useNetworkStatus();
const navigationItems: ReadonlyArray<{
  iconPath: string;
  label: string;
  prefetch: () => Promise<unknown>;
  to: RouteLocationRaw;
  value: NavigationValue;
}> = [
  {
    iconPath: "M3 10.5 12 3l9 7.5M5.5 9v11h13V9M9.5 20v-6h5v6",
    label: "Home",
    prefetch: prefetch.home,
    to: "/",
    value: "home",
  },
  {
    iconPath: "M4 5.5h16v14H4zM8 5.5v14M12 5.5v14M16 5.5v14",
    label: "Library",
    prefetch: prefetch.videos,
    to: "/videos",
    value: "videos",
  },
  {
    iconPath:
      "M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7ZM19 13.5v-3l-2.2-.6-.7-1.6 1.1-2-2.1-2.1-2 1.1-1.6-.7L10.5 2h-3l-.6 2.2-1.6.7-2-1.1-2.1 2.1 1.1 2-.7 1.6L0 10.5v3l2.2.6.7 1.6-1.1 2 2.1 2.1 2-1.1 1.6.7.6 2.2h3l.6-2.2 1.6-.7 2 1.1 2.1-2.1-1.1-2 .7-1.6 2-.6Z",
    label: "Settings",
    prefetch: prefetch.settingsLibrary,
    to: "/settings/library",
    value: "settings",
  },
];
</script>

<template>
  <aside
    class="fixed inset-y-0 left-0 z-50 hidden w-[168px] flex-col bg-pine-deep px-4 py-6 text-white min-[1024px]:flex"
    aria-label="Application navigation"
  >
    <IntentRouterLink to="/" :prefetch="prefetch.home" class="px-2" aria-label="Videos home">
      <AppLogo />
    </IntentRouterLink>

    <nav class="mt-10 grid gap-1.5" aria-label="Main navigation">
      <IntentRouterLink
        v-for="item in navigationItems"
        :key="item.value"
        :to="item.to"
        :prefetch="item.prefetch"
        class="flex min-h-11 items-center gap-3 rounded-[5px] px-3 text-[.76rem] font-bold tracking-[.03em] transition-[background,color,box-shadow]"
        :class="
          activeNavigation === item.value
            ? 'bg-pine text-belt-light shadow-[inset_3px_0_#d58b3b]'
            : 'text-white/55 hover:bg-white/6 hover:text-white'
        "
        :aria-current="activeNavigation === item.value ? 'page' : undefined"
      >
        <svg
          class="h-[18px] w-[18px] shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path :d="item.iconPath" />
        </svg>
        {{ item.label }}
      </IntentRouterLink>
    </nav>

    <div class="mt-auto border-t border-white/12 px-2 pt-4">
      <div class="flex items-center gap-2.5 text-[.68rem]">
        <span
          class="h-2 w-2 rounded-full"
          :class="online ? 'bg-belt-light' : 'bg-clay'"
          aria-hidden="true"
        />
        <span class="grid gap-0.5">
          <strong class="text-white/80">{{ online ? "Server online" : "Server offline" }}</strong>
          <span class="text-white/42">Private library</span>
        </span>
      </div>
    </div>
  </aside>

  <header
    class="sticky top-0 z-40 flex h-[calc(66px+env(safe-area-inset-top))] items-center justify-between border-b border-white/12 bg-pine-deep/[.97] px-[22px] pt-[env(safe-area-inset-top)] text-white backdrop-blur-[14px] min-[1024px]:hidden"
  >
    <IntentRouterLink to="/" :prefetch="prefetch.home" aria-label="Videos home">
      <AppLogo />
    </IntentRouterLink>
    <IntentRouterLink
      to="/videos"
      :prefetch="prefetch.videos"
      class="grid h-11 w-11 place-items-center rounded-[5px] text-white/72 hover:bg-white/8 hover:text-white"
      aria-label="Search library"
    >
      <svg
        class="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        aria-hidden="true"
      >
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m16 16 5 5" />
      </svg>
    </IntentRouterLink>
  </header>

  <nav
    v-if="!player"
    class="fixed right-0 bottom-0 left-0 z-50 hidden grid-cols-3 border-t border-white/12 bg-pine-deep/[.98] px-3 pt-1.5 pb-[max(6px,env(safe-area-inset-bottom))] text-white shadow-[0_-12px_35px_rgb(18_22_28_/_24%)] backdrop-blur-[14px] max-[600px]:grid"
    aria-label="Mobile navigation"
  >
    <IntentRouterLink
      v-for="item in navigationItems"
      :key="item.value"
      :to="item.to"
      :prefetch="item.prefetch"
      class="relative flex min-h-[58px] flex-col items-center justify-center gap-1 rounded-[8px] text-[.62rem] font-bold tracking-[.04em]"
      :class="activeNavigation === item.value ? 'text-belt-light' : 'text-white/48'"
      :aria-current="activeNavigation === item.value ? 'page' : undefined"
    >
      <svg
        class="h-[19px] w-[19px]"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path :d="item.iconPath" />
      </svg>
      <span>{{ item.label }}</span>
    </IntentRouterLink>
  </nav>
</template>
