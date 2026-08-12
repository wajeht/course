<script setup lang="ts">
import { computed, ref } from "vue";

import type { AuthStatus } from "../composables/useAuth.js";
import AlertMessage from "./ui/AlertMessage.vue";
import AppButton from "./ui/AppButton.vue";
import AppInput from "./ui/AppInput.vue";
import AppLogo from "./ui/AppLogo.vue";
import FormField from "./ui/FormField.vue";
import PanelCard from "./ui/PanelCard.vue";

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
    <PanelCard class="w-full max-w-[430px]" padding="none">
      <header class="bg-pine-deep px-8 py-7 text-white">
        <AppLogo />
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
        <AppButton class="mt-6" block size="lg" @click="emit('retry')"> Try again </AppButton>
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

        <FormField
          v-if="isSetup && setupTokenRequired"
          v-slot="{ inputId, describedBy, invalid }"
          class="mt-6"
          label="Setup token"
          required
        >
          <AppInput
            :id="inputId"
            v-model="setupToken"
            :aria-describedby="describedBy"
            :invalid="invalid"
            type="password"
            autocomplete="one-time-code"
            required
          />
        </FormField>

        <FormField
          v-slot="{ inputId, describedBy, invalid }"
          class="mt-6"
          label="Password"
          required
        >
          <AppInput
            :id="inputId"
            v-model="password"
            :aria-describedby="describedBy"
            :invalid="invalid"
            type="password"
            :autocomplete="isSetup ? 'new-password' : 'current-password'"
            minlength="8"
            maxlength="72"
            required
            autofocus
          />
        </FormField>

        <FormField
          v-if="isSetup"
          v-slot="{ inputId, describedBy, invalid }"
          class="mt-4"
          label="Confirm password"
          :error="formError"
          required
        >
          <AppInput
            :id="inputId"
            v-model="confirmPassword"
            :aria-describedby="describedBy"
            :invalid="invalid"
            type="password"
            autocomplete="new-password"
            minlength="8"
            maxlength="72"
            required
          />
        </FormField>

        <AlertMessage v-if="message" class="mt-4">
          {{ message }}
        </AlertMessage>

        <AppButton
          class="mt-6"
          block
          size="lg"
          type="submit"
          :loading="busy"
          loading-label="Please wait…"
        >
          {{ isSetup ? "Create password" : "Sign in" }}
        </AppButton>
      </form>
    </PanelCard>
  </main>
</template>
