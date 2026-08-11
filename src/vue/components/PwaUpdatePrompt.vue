<script setup lang="ts">
import { useRegisterSW } from "virtual:pwa-register/vue";

const { needRefresh, offlineReady, updateServiceWorker } = useRegisterSW({ immediate: true });

function close(): void {
  needRefresh.value = false;
  offlineReady.value = false;
}
</script>

<template>
  <aside
    v-if="offlineReady || needRefresh"
    class="fixed right-5 bottom-5 z-50 w-[min(380px,calc(100%-40px))] rounded-[10px] border border-white/15 bg-pine-deep p-5 text-white shadow-[0_20px_55px_rgb(10_25_18_/_35%)]"
    aria-live="polite"
  >
    <p class="font-display text-lg font-extrabold tracking-[.02em]">
      {{ needRefresh ? "Course update available" : "Course is ready offline" }}
    </p>
    <p class="mt-1.5 text-[.78rem] leading-5 text-white/68">
      {{
        needRefresh
          ? "Reload when you are ready to use the latest version."
          : "The app shell works offline; course data and videos still require the server."
      }}
    </p>
    <div class="mt-4 flex gap-2">
      <button
        v-if="needRefresh"
        class="min-h-9 cursor-pointer rounded-[6px] bg-belt-light px-4 text-[.75rem] font-bold text-pine-deep"
        type="button"
        @click="updateServiceWorker(true)"
      >
        Reload
      </button>
      <button
        class="min-h-9 cursor-pointer rounded-[6px] border border-white/20 px-4 text-[.75rem] font-bold text-white"
        type="button"
        @click="close"
      >
        {{ needRefresh ? "Later" : "Close" }}
      </button>
    </div>
  </aside>
</template>
