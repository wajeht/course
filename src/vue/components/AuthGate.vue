<script setup lang="ts">
import { computed, ref } from "vue";

import type { AuthStatus } from "../composables/useAuth.js";

const props = defineProps<{
  status: AuthStatus;
  passwordConfigured: boolean;
  setupEnabled: boolean;
  setupTokenRequired: boolean;
  busy: boolean;
  message?: string;
}>();

const emit = defineEmits<{
  login: [password: string];
  setup: [password: string, confirmPassword: string, setupToken?: string];
  retry: [];
}>();

const password = ref("");
const confirmPassword = ref("");
const setupToken = ref("");
const formError = ref("");
const isSetup = computed(() => !props.passwordConfigured);

async function submit(): Promise<void> {
  if (props.busy) return;
  formError.value = "";
  if (isSetup.value && password.value !== confirmPassword.value) {
    formError.value = "Passwords do not match";
    return;
  }
  if (isSetup.value) {
    emit("setup", password.value, confirmPassword.value, setupToken.value || undefined);
  } else {
    emit("login", password.value);
  }
}
</script>

<template>
  <main class="grid min-h-screen place-items-center bg-canvas px-5 py-12">
    <section
      class="w-full max-w-[430px] overflow-hidden rounded-[12px] border border-line bg-white shadow-course"
    >
      <header class="bg-pine-deep px-8 py-7 text-white">
        <div
          class="flex items-center gap-3 font-display text-2xl font-extrabold tracking-[.04em] uppercase"
        >
          <span
            class="flex h-[22px] w-9 items-center gap-[3px] rounded-[3px] border-2 border-current px-[5px] py-1"
            aria-hidden="true"
          >
            <i class="block h-full w-1 bg-belt-light" />
            <i class="block h-full w-1 bg-belt-light" />
            <i class="block h-full w-1 bg-belt-light" />
          </span>
          Course
        </div>
        <p class="mt-3 text-sm leading-6 text-white/68">
          {{
            isSetup
              ? "Create the password that protects your private course library."
              : "Enter your password to continue learning."
          }}
        </p>
      </header>

      <div v-if="status === 'loading'" class="px-8 py-10 text-sm text-muted">
        Checking your session…
      </div>

      <div v-else-if="status === 'error'" class="px-8 py-8">
        <h1 class="font-display text-2xl font-extrabold">Connection required</h1>
        <p class="mt-2 text-sm leading-6 text-muted">
          {{ message || "Course could not verify your session." }}
        </p>
        <button
          class="mt-6 min-h-11 w-full cursor-pointer rounded-[7px] bg-pine px-5 text-sm font-bold text-white hover:bg-pine-deep"
          type="button"
          @click="emit('retry')"
        >
          Try again
        </button>
      </div>

      <div v-else-if="isSetup && !setupEnabled" class="px-8 py-8">
        <h1 class="font-display text-2xl font-extrabold">Setup unavailable</h1>
        <p class="mt-2 text-sm leading-6 text-muted">
          Configure <code>AUTH_SETUP_TOKEN</code> on the server, then restart Course.
        </p>
      </div>

      <form v-else class="px-8 py-8" @submit.prevent="submit">
        <h1 class="font-display text-2xl font-extrabold">
          {{ isSetup ? "Secure Course" : "Welcome back" }}
        </h1>
        <input
          class="sr-only"
          name="username"
          value="admin"
          autocomplete="username"
          readonly
          tabindex="-1"
        />

        <label
          v-if="isSetup && setupTokenRequired"
          class="mt-6 block text-xs font-bold tracking-[.08em] text-pine uppercase"
        >
          Setup token
          <input
            v-model="setupToken"
            class="mt-2 min-h-11 w-full rounded-[7px] border border-line px-3 text-sm font-normal tracking-normal text-ink normal-case outline-none focus:border-pine"
            type="password"
            autocomplete="one-time-code"
            required
          />
        </label>

        <label class="mt-6 block text-xs font-bold tracking-[.08em] text-pine uppercase">
          Password
          <input
            v-model="password"
            class="mt-2 min-h-11 w-full rounded-[7px] border border-line px-3 text-sm font-normal tracking-normal text-ink normal-case outline-none focus:border-pine"
            type="password"
            :autocomplete="isSetup ? 'new-password' : 'current-password'"
            minlength="8"
            maxlength="72"
            required
            autofocus
          />
        </label>

        <label
          v-if="isSetup"
          class="mt-4 block text-xs font-bold tracking-[.08em] text-pine uppercase"
        >
          Confirm password
          <input
            v-model="confirmPassword"
            class="mt-2 min-h-11 w-full rounded-[7px] border border-line px-3 text-sm font-normal tracking-normal text-ink normal-case outline-none focus:border-pine"
            type="password"
            autocomplete="new-password"
            minlength="8"
            maxlength="72"
            required
          />
        </label>

        <p
          v-if="formError || message"
          class="mt-4 rounded-[7px] border border-[#e8b7ae] bg-[#f8e5e1] px-3 py-2 text-sm text-[#6c241c]"
        >
          {{ formError || message }}
        </p>

        <button
          class="mt-6 min-h-11 w-full cursor-pointer rounded-[7px] bg-pine px-5 text-sm font-bold text-white hover:bg-pine-deep disabled:cursor-wait disabled:opacity-60"
          type="submit"
          :disabled="busy"
        >
          {{ busy ? "Please wait…" : isSetup ? "Create password" : "Sign in" }}
        </button>
      </form>
    </section>
  </main>
</template>
