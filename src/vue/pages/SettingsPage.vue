<script setup lang="ts">
import { computed, ref, shallowRef } from "vue";

import { api } from "../api";
import PageHeader from "../components/PageHeader.vue";
import { useAuth } from "../composables/useAuth.js";
import { useAsyncData } from "../composables/useAsyncData.js";
import StandardPageLayout from "../layouts/StandardPageLayout.vue";

const scanRequest = useAsyncData(({ signal }) => api.getScanStatus(signal));
const auth = useAuth();
const scanning = ref(false);
const changingPassword = ref(false);
const loggingOut = ref(false);
const currentPassword = ref("");
const newPassword = ref("");
const confirmPassword = ref("");
const passwordMessage = ref("");
const passwordError = ref("");
const rescanError = shallowRef<unknown>(null);
const scanStatus = computed(() => scanRequest.data.value);
const error = computed(() => {
  const caught = rescanError.value ?? scanRequest.error.value;
  return caught instanceof Error ? caught.message : caught ? "Could not load scan status" : "";
});

async function rescanCatalog(): Promise<void> {
  scanning.value = true;
  rescanError.value = null;
  try {
    scanRequest.data.value = await api.rescanCatalog();
  } catch (caught) {
    rescanError.value = caught;
  } finally {
    scanning.value = false;
  }
}

async function changePassword(): Promise<void> {
  passwordMessage.value = "";
  passwordError.value = "";
  if (newPassword.value !== confirmPassword.value) {
    passwordError.value = "Passwords do not match";
    return;
  }
  changingPassword.value = true;
  try {
    await auth.changePassword(currentPassword.value, newPassword.value, confirmPassword.value);
    currentPassword.value = "";
    newPassword.value = "";
    confirmPassword.value = "";
    passwordMessage.value = "Password changed successfully";
  } catch (caught) {
    passwordError.value = caught instanceof Error ? caught.message : "Could not change password";
  } finally {
    changingPassword.value = false;
  }
}

async function logout(): Promise<void> {
  loggingOut.value = true;
  passwordError.value = "";
  try {
    await auth.logout();
  } catch (caught) {
    passwordError.value = caught instanceof Error ? caught.message : "Could not sign out";
  } finally {
    loggingOut.value = false;
  }
}
</script>

<template>
  <StandardPageLayout>
    <PageHeader
      eyebrow="Course library"
      title="Settings"
      description="Manage how your course library finds and updates local content."
    />

    <div
      v-if="error"
      class="mt-8 rounded-lg border border-[#e8b7ae] bg-[#f8e5e1] px-[18px] py-[14px] text-[.88rem] text-[#6c241c]"
    >
      {{ error }}
    </div>

    <section
      class="mt-10 rounded-[10px] border border-line bg-white p-[clamp(22px,4vw,34px)] shadow-course"
    >
      <div
        class="flex items-center justify-between gap-6 max-[600px]:flex-col max-[600px]:items-start"
      >
        <div>
          <h2 class="text-lg font-[750]">Library scan</h2>
          <p class="mt-1.5 max-w-[500px] text-[.85rem] leading-6 text-muted">
            Scan your video folders now to find new or changed courses.
          </p>
          <p v-if="scanStatus?.completedAt" class="mt-3 text-[.74rem] font-semibold text-pine">
            {{
              scanStatus.warnings.length
                ? `${scanStatus.warnings.length} scan warnings`
                : `${scanStatus.courseCount} courses · ${scanStatus.lessonCount} lessons`
            }}
          </p>
        </div>
        <button
          class="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-[7px] bg-pine px-5 text-[.78rem] font-[750] text-white transition-[transform,background] duration-[160ms] enabled:hover:-translate-y-px enabled:hover:bg-pine-deep disabled:cursor-wait disabled:opacity-55 max-[600px]:w-full"
          :disabled="scanning"
          @click="rescanCatalog"
        >
          <svg
            class="w-4 fill-none stroke-current stroke-[1.8]"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M20 7v5h-5M4 17v-5h5m10.1-3A8 8 0 0 0 5.5 6M4.9 15A8 8 0 0 0 18.5 18" />
          </svg>
          {{ scanning ? "Scanning…" : "Rescan library" }}
        </button>
      </div>
    </section>

    <section
      class="mt-6 rounded-[10px] border border-line bg-white p-[clamp(22px,4vw,34px)] shadow-course"
    >
      <div class="grid gap-8 md:grid-cols-[1fr_1.2fr]">
        <div>
          <h2 class="text-lg font-[750]">Access</h2>
          <p class="mt-1.5 max-w-[500px] text-[.85rem] leading-6 text-muted">
            Change the password for this private library or sign out of this device.
          </p>
          <button
            class="mt-5 min-h-10 cursor-pointer rounded-[7px] border border-line px-5 text-[.78rem] font-[750] text-pine hover:border-pine"
            type="button"
            :disabled="loggingOut"
            @click="logout"
          >
            {{ loggingOut ? "Signing out…" : "Sign out" }}
          </button>
        </div>

        <form class="grid gap-4" @submit.prevent="changePassword">
          <input
            class="sr-only"
            name="username"
            value="admin"
            autocomplete="username"
            readonly
            tabindex="-1"
          />
          <label class="text-xs font-bold tracking-[.08em] text-pine uppercase">
            Current password
            <input
              v-model="currentPassword"
              class="mt-2 min-h-10 w-full rounded-[7px] border border-line px-3 text-sm font-normal tracking-normal text-ink normal-case outline-none focus:border-pine"
              type="password"
              autocomplete="current-password"
              required
            />
          </label>
          <label class="text-xs font-bold tracking-[.08em] text-pine uppercase">
            New password
            <input
              v-model="newPassword"
              class="mt-2 min-h-10 w-full rounded-[7px] border border-line px-3 text-sm font-normal tracking-normal text-ink normal-case outline-none focus:border-pine"
              type="password"
              autocomplete="new-password"
              minlength="8"
              maxlength="72"
              required
            />
          </label>
          <label class="text-xs font-bold tracking-[.08em] text-pine uppercase">
            Confirm new password
            <input
              v-model="confirmPassword"
              class="mt-2 min-h-10 w-full rounded-[7px] border border-line px-3 text-sm font-normal tracking-normal text-ink normal-case outline-none focus:border-pine"
              type="password"
              autocomplete="new-password"
              minlength="8"
              maxlength="72"
              required
            />
          </label>
          <p v-if="passwordError" class="text-sm text-[#8b3025]">{{ passwordError }}</p>
          <p v-else-if="passwordMessage" class="text-sm font-semibold text-pine">
            {{ passwordMessage }}
          </p>
          <button
            class="min-h-10 cursor-pointer rounded-[7px] bg-pine px-5 text-[.78rem] font-[750] text-white hover:bg-pine-deep disabled:cursor-wait disabled:opacity-55"
            type="submit"
            :disabled="changingPassword"
          >
            {{ changingPassword ? "Saving…" : "Change password" }}
          </button>
        </form>
      </div>
    </section>
  </StandardPageLayout>
</template>
