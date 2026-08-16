<script setup lang="ts">
import { computed, ref, watch } from "vue";

import { api, type CatalogPageSize } from "@/api.js";
import AlertMessage from "@/components/ui/AlertMessage.vue";
import AppButton from "@/components/ui/AppButton.vue";
import AppInput from "@/components/ui/AppInput.vue";
import AppSelect from "@/components/ui/AppSelect.vue";
import FormField from "@/components/ui/FormField.vue";
import PageHeader from "@/components/ui/PageHeader.vue";
import PanelCard from "@/components/ui/PanelCard.vue";
import PanelCardHeader from "@/components/ui/PanelCardHeader.vue";
import { useAsyncAction } from "@/composables/useAsyncAction.js";
import { useAsyncData } from "@/composables/useAsyncData.js";
import { useAuth } from "@/composables/useAuth.js";
import { useConfirm } from "@/composables/useConfirm.js";
import { useToast } from "@/composables/useToast.js";
import StandardPageLayout from "@/layouts/StandardPageLayout.vue";
import SettingsNavigation, { type SettingsSection } from "@/pages/partials/SettingsNavigation.vue";
import { countText } from "@/utils.js";

const scanRequest = useAsyncData(({ signal }) => api.getScanStatus(signal));
const settingsRequest = useAsyncData(({ signal }) => api.getSettings(signal));
const auth = useAuth();
const confirmation = useConfirm();
const toast = useToast();
const activeSection = ref<SettingsSection>("data");
const currentPassword = ref("");
const newPassword = ref("");
const confirmPassword = ref("");
const catalogPageSize = ref<CatalogPageSize>(24);
const validationError = ref("");
const scanStatus = computed(() => scanRequest.data.value);
const rescanAction = useAsyncAction(() => api.rescanCatalog(), {
  errorMessage: "Could not rescan the library",
  onSuccess: (status) => {
    scanRequest.data.value = status;
    toast.success("Library scan complete");
  },
});
const settingsAction = useAsyncAction(() => api.updateSettings(catalogPageSize.value), {
  errorMessage: "Could not save library settings",
  onSuccess: (settings) => {
    settingsRequest.data.value = settings;
    catalogPageSize.value = settings.catalogPageSize;
    toast.success("Library settings saved");
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
const settingsError = computed(() => {
  if (settingsAction.errorMessage.value) return settingsAction.errorMessage.value;
  const caught = settingsRequest.error.value;
  return caught instanceof Error ? caught.message : caught ? "Could not load settings" : "";
});

watch(settingsRequest.data, (settings) => {
  if (settings) catalogPageSize.value = settings.catalogPageSize;
});

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

async function saveSettings(): Promise<void> {
  await settingsAction.run();
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
    <PageHeader eyebrow="Course settings" title="Settings" />

    <AlertMessage v-if="logoutAction.errorMessage.value" class="mt-8" size="lg">
      {{ logoutAction.errorMessage.value }}
    </AlertMessage>

    <div
      class="mt-6 grid grid-cols-4 items-start gap-[clamp(18px,2vw,30px)] max-[1120px]:grid-cols-3 max-[860px]:grid-cols-2 max-[760px]:grid-cols-1"
      data-settings-layout
    >
      <div class="grid gap-[clamp(18px,2vw,30px)]">
        <SettingsNavigation v-model="activeSection" />
        <div class="max-[760px]:hidden" data-desktop-sign-out-container>
          <AppButton
            class="min-h-12"
            block
            size="lg"
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

      <section
        v-if="activeSection === 'data'"
        id="settings-data-panel"
        class="col-span-3 grid gap-[clamp(18px,2vw,30px)] max-[1120px]:col-span-2 max-[860px]:col-span-1"
        aria-labelledby="settings-data-tab"
      >
        <AlertMessage v-if="scanError" size="lg">
          {{ scanError }}
        </AlertMessage>
        <AlertMessage v-if="settingsError" size="lg">
          {{ settingsError }}
        </AlertMessage>

        <PanelCard class="min-h-[260px]" padding="none">
          <PanelCardHeader
            title="Library scan"
            description="Scan your video folders now to find new or changed courses."
          />
          <div
            class="flex min-h-[180px] flex-col items-start justify-between gap-8 p-[clamp(22px,4vw,34px)]"
          >
            <div class="w-full">
              <p class="text-[.68rem] font-extrabold tracking-[.14em] text-belt uppercase">
                Library status
              </p>
              <p class="mt-3 text-[.85rem] font-semibold text-pine">
                <template v-if="scanStatus?.completedAt">
                  {{
                    scanStatus.warnings.length
                      ? countText(scanStatus.warnings.length, "library issue")
                      : `${countText(scanStatus.courseCount, "course")} · ${countText(scanStatus.lessonCount, "lesson")}`
                  }}
                </template>
                <template v-else>Scan status is loading…</template>
              </p>
              <div
                v-if="scanStatus?.warnings.length"
                class="mt-5 rounded-[7px] border border-belt/25 bg-[#fffaf0] p-4"
              >
                <p class="text-[.78rem] leading-5 text-muted">
                  Review these files, correct each listed problem, then rescan the library.
                </p>
                <ul class="mt-3 grid gap-3" aria-label="Library issues">
                  <li
                    v-for="warning in scanStatus.warnings"
                    :key="`${warning.path}:${warning.message}`"
                    class="grid gap-1 text-[.78rem] leading-5"
                  >
                    <code class="break-all font-semibold text-pine-deep">{{ warning.path }}</code>
                    <span class="text-muted">{{ warning.message }}</span>
                  </li>
                </ul>
              </div>
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

        <PanelCard padding="none">
          <PanelCardHeader
            title="Library display"
            description="Choose how many courses appear on each library page."
          />
          <form
            class="flex items-end justify-between gap-6 p-[clamp(22px,4vw,34px)] max-[600px]:flex-col max-[600px]:items-stretch"
            @submit.prevent="saveSettings"
          >
            <FormField
              v-slot="field"
              class="w-full max-w-xs"
              label="Courses per page"
              help-text="This becomes the default for library and instructor pages."
            >
              <AppSelect
                :id="field.inputId"
                v-model="catalogPageSize"
                :aria-describedby="field.describedBy"
                :disabled="settingsRequest.loading.value || settingsAction.pending.value"
                class="w-full"
              >
                <option :value="12">12</option>
                <option :value="24">24</option>
                <option :value="48">48</option>
                <option :value="96">96</option>
              </AppSelect>
            </FormField>
            <AppButton
              type="submit"
              :disabled="settingsRequest.loading.value"
              :loading="settingsAction.pending.value"
              loading-label="Saving…"
            >
              Save display
            </AppButton>
          </form>
        </PanelCard>
      </section>

      <section
        v-else
        id="settings-auth-panel"
        class="col-span-3 max-[1120px]:col-span-2 max-[860px]:col-span-1"
        aria-labelledby="settings-auth-tab"
      >
        <PanelCard padding="none">
          <PanelCardHeader
            title="Access"
            description="Change the password for this private library or sign out of this device."
          />
          <form class="grid gap-4 p-[clamp(22px,4vw,34px)]" @submit.prevent="changePassword">
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
            <FormField
              v-slot="field"
              label="New password"
              help-text="Use at least 15 characters."
              required
            >
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

      <div class="col-span-full hidden max-[760px]:block" data-mobile-sign-out-container>
        <AppButton
          class="min-h-12"
          block
          size="lg"
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
  </StandardPageLayout>
</template>
