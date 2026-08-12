<script setup lang="ts">
import { computed, ref } from "vue";

import { api } from "@/api.js";
import AlertMessage from "@/components/ui/AlertMessage.vue";
import AppButton from "@/components/ui/AppButton.vue";
import AppInput from "@/components/ui/AppInput.vue";
import FormField from "@/components/ui/FormField.vue";
import PageHeader from "@/components/ui/PageHeader.vue";
import PanelCard from "@/components/ui/PanelCard.vue";
import { useAsyncAction } from "@/composables/useAsyncAction.js";
import { useAsyncData } from "@/composables/useAsyncData.js";
import { useAuth } from "@/composables/useAuth.js";
import { useConfirm } from "@/composables/useConfirm.js";
import { useToast } from "@/composables/useToast.js";
import StandardPageLayout from "@/layouts/StandardPageLayout.vue";
import SettingsNavigation, { type SettingsSection } from "@/pages/partials/SettingsNavigation.vue";

const scanRequest = useAsyncData(({ signal }) => api.getScanStatus(signal));
const auth = useAuth();
const confirmation = useConfirm();
const toast = useToast();
const activeSection = ref<SettingsSection>("data");
const currentPassword = ref("");
const newPassword = ref("");
const confirmPassword = ref("");
const validationError = ref("");
const scanStatus = computed(() => scanRequest.data.value);
const rescanAction = useAsyncAction(() => api.rescanCatalog(), {
  errorMessage: "Could not rescan the library",
  onSuccess: (status) => {
    scanRequest.data.value = status;
    toast.success("Library scan complete");
  },
});
const passwordAction = useAsyncAction(
  () => auth.changePassword(currentPassword.value, newPassword.value, confirmPassword.value),
  {
    errorMessage: "Could not change password",
    onSuccess: () => {
      currentPassword.value = "";
      newPassword.value = "";
      confirmPassword.value = "";
      toast.success("Password changed successfully");
    },
  },
);
const logoutAction = useAsyncAction(() => auth.logout(), {
  errorMessage: "Could not sign out",
});
const scanError = computed(() => {
  if (rescanAction.errorMessage.value) return rescanAction.errorMessage.value;
  const caught = scanRequest.error.value;
  return caught instanceof Error ? caught.message : caught ? "Could not load scan status" : "";
});
const passwordError = computed(() => validationError.value || passwordAction.errorMessage.value);

async function rescanCatalog(): Promise<void> {
  await rescanAction.run();
}

async function changePassword(): Promise<void> {
  validationError.value = "";
  passwordAction.clearError();
  if (newPassword.value !== confirmPassword.value) {
    validationError.value = "Passwords do not match";
    return;
  }
  await passwordAction.run();
}

async function logout(): Promise<void> {
  const confirmed = await confirmation.confirm({
    title: "Sign out?",
    message: "You will need the Course password to access this library again.",
    confirmLabel: "Sign out",
  });
  if (!confirmed) return;
  await logoutAction.run();
}
</script>

<template>
  <StandardPageLayout>
    <PageHeader
      title="Settings"
      description="Manage how your course library finds and updates local content."
    />

    <AlertMessage
      v-if="logoutAction.errorMessage.value"
      class="mt-8 px-[18px] py-[14px] text-[.88rem]"
    >
      {{ logoutAction.errorMessage.value }}
    </AlertMessage>

    <div
      class="mt-12 grid grid-cols-[220px_minmax(0,1fr)] items-start gap-[clamp(36px,6vw,86px)] max-[760px]:grid-cols-1 max-[760px]:gap-8"
    >
      <SettingsNavigation
        v-model="activeSection"
        :signing-out="logoutAction.pending.value"
        @sign-out="logout"
      />

      <section
        v-if="activeSection === 'data'"
        id="settings-data-panel"
        role="tabpanel"
        aria-labelledby="settings-data-tab"
      >
        <h2 class="text-xl font-[750]">Library scan</h2>
        <p class="mt-1.5 max-w-[620px] text-[.85rem] leading-6 text-muted">
          Scan your video folders now to find new or changed courses.
        </p>

        <AlertMessage v-if="scanError" class="mt-5 px-[18px] py-[14px] text-[.88rem]">
          {{ scanError }}
        </AlertMessage>

        <PanelCard class="mt-5 min-h-[260px]" padding="default">
          <div class="flex h-full flex-col items-start justify-between gap-8">
            <div class="w-full">
              <p class="text-[.68rem] font-extrabold tracking-[.14em] text-belt uppercase">
                Library status
              </p>
              <p class="mt-3 text-[.85rem] font-semibold text-pine">
                <template v-if="scanStatus?.completedAt">
                  {{
                    scanStatus.warnings.length
                      ? `${scanStatus.warnings.length} scan warnings`
                      : `${scanStatus.courseCount} courses · ${scanStatus.lessonCount} lessons`
                  }}
                </template>
                <template v-else>Scan status is loading…</template>
              </p>
            </div>
            <AppButton
              class="self-end max-[600px]:w-full"
              :loading="rescanAction.pending.value"
              loading-label="Scanning…"
              @click="rescanCatalog"
            >
              <svg
                class="w-4 fill-none stroke-current stroke-[1.8]"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M20 7v5h-5M4 17v-5h5m10.1-3A8 8 0 0 0 5.5 6M4.9 15A8 8 0 0 0 18.5 18" />
              </svg>
              Rescan library
            </AppButton>
          </div>
        </PanelCard>
      </section>

      <section v-else id="settings-auth-panel" role="tabpanel" aria-labelledby="settings-auth-tab">
        <h2 class="text-xl font-[750]">Access</h2>
        <p class="mt-1.5 max-w-[620px] text-[.85rem] leading-6 text-muted">
          Change the password for this private library or sign out of this device.
        </p>

        <PanelCard class="mt-5">
          <form class="grid gap-4" @submit.prevent="changePassword">
            <input
              class="sr-only"
              name="username"
              value="admin"
              autocomplete="username"
              readonly
              tabindex="-1"
            />
            <FormField v-slot="field" label="Current password" required>
              <AppInput
                :id="field.inputId"
                v-model="currentPassword"
                :aria-describedby="field.describedBy"
                :invalid="field.invalid"
                type="password"
                autocomplete="current-password"
                required
              />
            </FormField>
            <FormField v-slot="field" label="New password" required>
              <AppInput
                :id="field.inputId"
                v-model="newPassword"
                :aria-describedby="field.describedBy"
                :invalid="field.invalid"
                type="password"
                autocomplete="new-password"
                minlength="15"
                maxlength="72"
                required
              />
            </FormField>
            <FormField
              v-slot="field"
              label="Confirm new password"
              :error="validationError"
              required
            >
              <AppInput
                :id="field.inputId"
                v-model="confirmPassword"
                :aria-describedby="field.describedBy"
                :invalid="field.invalid"
                type="password"
                autocomplete="new-password"
                minlength="15"
                maxlength="72"
                required
              />
            </FormField>
            <AlertMessage v-if="passwordError && !validationError">
              {{ passwordError }}
            </AlertMessage>
            <AppButton
              class="justify-self-end max-[600px]:w-full"
              type="submit"
              :loading="passwordAction.pending.value"
              loading-label="Saving…"
            >
              Change password
            </AppButton>
          </form>
        </PanelCard>
      </section>
    </div>
  </StandardPageLayout>
</template>
