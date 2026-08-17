<script setup lang="ts">
import { computed, ref } from "vue";

import type { AuthStatus } from "@/composables/useAuth.js";
import AlertMessage from "@/components/ui/AlertMessage.vue";
import AppButton from "@/components/ui/AppButton.vue";
import AppInput from "@/components/ui/AppInput.vue";
import AppLogo from "@/components/ui/AppLogo.vue";
import FormField from "@/components/ui/FormField.vue";
import PanelCard from "@/components/ui/PanelCard.vue";

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
  <main class="min-h-screen bg-canvas lg:grid lg:grid-cols-[1fr_2fr]">
    <aside
      class="hidden min-h-screen items-center justify-center overflow-hidden bg-pine-deep bg-[radial-gradient(circle_at_83%_20%,rgb(196_147_63_/_16%),transparent_30%),repeating-linear-gradient(90deg,transparent_0_52px,rgb(255_255_255_/_2%)_52px_53px)] px-12 text-white lg:order-2 lg:flex"
      aria-label="Course playback"
    >
      <div class="flex w-full max-w-[560px] flex-col items-center gap-16" aria-hidden="true">
        <span
          class="block h-[clamp(96px,12vw,154px)] w-[clamp(110px,14vw,178px)] bg-belt-light drop-shadow-[0_18px_32px_rgb(0_0_0_/_25%)] [clip-path:polygon(0_0,100%_50%,0_100%)]"
        />
        <div class="h-[3px] w-full max-w-[460px] overflow-hidden rounded-full bg-white/18">
          <span class="block h-full w-3/5 rounded-full bg-belt-light" />
        </div>
      </div>
    </aside>

    <section
      class="grid min-h-screen place-items-center px-5 py-12 lg:order-1 lg:border-r lg:border-pine/10 lg:px-6 xl:px-[clamp(32px,3vw,56px)]"
    >
      <PanelCard class="w-full max-w-[430px] lg:max-w-[480px]" padding="none">
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

        <div v-if="status === 'loading'" class="px-8 py-10 text-sm text-muted lg:p-10">
          Checking your session…
        </div>

        <div v-else-if="status === 'error'" class="px-8 py-8 lg:p-10">
          <h1 class="font-display text-2xl font-extrabold lg:text-[2rem]">Connection required</h1>
          <p class="mt-2 text-sm leading-6 text-muted">
            {{ message || "The app could not verify your session." }}
          </p>
          <AppButton class="mt-6" block size="lg" @click="emit('retry')"> Try again </AppButton>
        </div>

        <div v-else-if="isSetup && !setupEnabled" class="px-8 py-8 lg:p-10">
          <h1 class="font-display text-2xl font-extrabold lg:text-[2rem]">Setup unavailable</h1>
          <p class="mt-2 text-sm leading-6 text-muted">
            Configure <code>AUTH_SETUP_TOKEN</code> on the server, then restart the app.
          </p>
        </div>

        <form v-else class="px-8 py-8 lg:p-10" @submit.prevent="submit">
          <h1 class="font-display text-2xl font-extrabold lg:text-[2rem]">
            {{ isSetup ? "Set up your library" : "Welcome back" }}
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
            help-text="Enter the one-time setup token configured on your server."
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
            :help-text="isSetup ? 'Use at least 15 characters.' : undefined"
            required
          >
            <AppInput
              :id="inputId"
              v-model="password"
              :aria-describedby="describedBy"
              :invalid="invalid"
              type="password"
              :autocomplete="isSetup ? 'new-password' : 'current-password'"
              :minlength="isSetup ? 15 : undefined"
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
              minlength="15"
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
    </section>
  </main>
</template>
