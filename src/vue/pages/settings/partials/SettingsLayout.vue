<script setup lang="ts">
import AlertMessage from "@/components/ui/AlertMessage.vue";
import AppButton from "@/components/ui/AppButton.vue";
import AppFooter from "@/components/ui/AppFooter.vue";
import PageHeader from "@/components/ui/PageHeader.vue";
import { useAsyncAction } from "@/composables/useAsyncAction.js";
import { useAuth } from "@/composables/useAuth.js";
import { useConfirm } from "@/composables/useConfirm.js";
import StandardPageLayout from "@/layouts/StandardPageLayout.vue";
import SettingsNavigation from "@/pages/settings/partials/SettingsNavigation.vue";

defineSlots<{
  default(): unknown;
}>();

const auth = useAuth();
const confirmation = useConfirm();
const logoutAction = useAsyncAction(() => auth.logout(), {
  errorMessage: "Could not sign out",
});

async function logout(): Promise<void> {
  const confirmed = await confirmation.confirm({
    title: "Sign out?",
    message: "You will need the library password to access it again.",
    confirmLabel: "Sign out",
  });
  if (!confirmed) return;
  await logoutAction.run();
}
</script>

<template>
  <StandardPageLayout
    class="min-[601px]:flex min-[601px]:min-h-[calc(100vh-66px)] min-[601px]:flex-col min-[601px]:pb-10"
  >
    <PageHeader eyebrow="Playlist settings" title="Settings" />

    <AlertMessage v-if="logoutAction.errorMessage.value" class="mt-8" size="lg">
      {{ logoutAction.errorMessage.value }}
    </AlertMessage>

    <div
      class="mt-6 grid grid-cols-4 items-start gap-[clamp(18px,2vw,30px)] max-[1120px]:grid-cols-3 max-[860px]:grid-cols-2 max-[760px]:grid-cols-1"
      data-settings-layout
    >
      <div class="grid gap-[clamp(18px,2vw,30px)]">
        <SettingsNavigation />
        <div class="max-[760px]:hidden" data-desktop-sign-out-container>
          <AppButton
            class="h-10"
            block
            size="md"
            variant="danger"
            :loading="logoutAction.pending.value"
            loading-label="Signing out…"
            data-desktop-sign-out
            @click="logout"
          >
            Sign out
          </AppButton>
        </div>
      </div>

      <slot />

      <div class="col-span-full hidden max-[760px]:block" data-mobile-sign-out-container>
        <AppButton
          class="h-10"
          block
          size="md"
          variant="danger"
          :loading="logoutAction.pending.value"
          loading-label="Signing out…"
          data-mobile-sign-out
          @click="logout"
        >
          Sign out
        </AppButton>
      </div>
    </div>

    <AppFooter class="mt-12 min-[601px]:mt-auto min-[601px]:pt-12" />
  </StandardPageLayout>
</template>
