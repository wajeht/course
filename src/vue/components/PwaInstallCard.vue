<script setup lang="ts">
import { ref } from "vue";

import AppButton from "@/components/ui/AppButton.vue";
import AppLogo from "@/components/ui/AppLogo.vue";
import PanelCard from "@/components/ui/PanelCard.vue";
import PanelCardHeader from "@/components/ui/PanelCardHeader.vue";
import { usePwaInstall } from "@/composables/usePwaInstall.js";

const pwaInstall = usePwaInstall();
const dismissed = ref(false);

async function install(): Promise<void> {
  dismissed.value = !(await pwaInstall.install());
}
</script>

<template>
  <PanelCard v-if="!pwaInstall.state.installed" padding="none" data-pwa-install-card>
    <PanelCardHeader
      title="Install Course"
      description="Open your library in its own app window."
    />
    <div
      class="grid grid-cols-[112px_minmax(0,1fr)_auto] items-center gap-7 p-[clamp(22px,4vw,34px)] max-[700px]:grid-cols-[88px_minmax(0,1fr)] max-[600px]:gap-5"
    >
      <div
        class="grid aspect-square place-items-center rounded-[18px] bg-pine-deep text-white shadow-[0_16px_34px_rgb(21_51_38_/_20%)]"
        aria-hidden="true"
      >
        <AppLogo :show-text="false" class="scale-125 text-belt-light" />
      </div>

      <div class="min-w-0">
        <p class="text-sm font-[750] text-pine-deep">
          {{ pwaInstall.state.iosInstructions ? "Add Course to your Home Screen" : "Course app" }}
        </p>
        <p class="mt-1.5 text-[.82rem] leading-6 text-muted">
          <template v-if="pwaInstall.state.iosInstructions">
            Open this page in Safari, tap Share, then choose Add to Home Screen.
          </template>
          <template v-else-if="pwaInstall.state.canInstall">
            Keep your course library easy to open without browser controls.
          </template>
          <template v-else>
            Use your browser menu and choose Install app or Add to Home Screen.
          </template>
        </p>
        <p v-if="dismissed" class="mt-2 text-xs font-semibold text-clay" role="status">
          Installation was not completed. You can try again from your browser menu.
        </p>
      </div>

      <AppButton
        v-if="pwaInstall.state.canInstall"
        class="max-[700px]:col-span-2 max-[700px]:w-full"
        size="lg"
        variant="accent"
        :loading="pwaInstall.state.installing"
        loading-label="Opening…"
        @click="install"
      >
        Install Course
      </AppButton>
    </div>
  </PanelCard>
</template>
