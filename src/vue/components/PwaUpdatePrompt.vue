<script setup lang="ts">
import { useRegisterSW } from "virtual:pwa-register/vue";

import AppButton from "@/components/ui/AppButton.vue";

const { needRefresh, offlineReady, updateServiceWorker } = useRegisterSW({ immediate: true });

function close(): void {
  needRefresh.value = false;
  offlineReady.value = false;
}
</script>

<template>
  <aside
    v-if="offlineReady || needRefresh"
    class="fixed right-5 bottom-5 z-50 w-[min(380px,calc(100%-40px))] rounded-[10px] border border-white/15 bg-pine-deep p-5 text-white shadow-[0_20px_55px_rgb(10_25_18_/_35%)] max-[600px]:bottom-[calc(76px+env(safe-area-inset-bottom))]"
    aria-live="polite"
  >
    <p class="font-display text-lg font-extrabold tracking-[.02em]">
      {{ needRefresh ? "Course update available" : "Course can open offline" }}
    </p>
    <p class="mt-1.5 text-[.78rem] leading-5 text-white/68">
      {{
        needRefresh
          ? "Reload when you are ready to use the latest version."
          : "You can open the app without internet, but courses and videos still require a connection to your server."
      }}
    </p>
    <div class="mt-4 flex gap-2">
      <AppButton v-if="needRefresh" variant="accent" size="sm" @click="updateServiceWorker(true)">
        Reload
      </AppButton>
      <AppButton variant="outline-inverse" size="sm" @click="close">
        {{ needRefresh ? "Later" : "Close" }}
      </AppButton>
    </div>
  </aside>
</template>
