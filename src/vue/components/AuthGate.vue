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
      class="hidden min-h-screen items-center justify-center overflow-hidden bg-pine-deep px-12 text-white lg:order-2 lg:flex"
      aria-label="Course lesson preview"
    >
      <div class="w-full max-w-[540px]" aria-hidden="true">
        <p
          class="mb-5 font-display text-sm font-extrabold tracking-[.14em] text-white/60 uppercase"
        >
          Lesson in progress
        </p>
        <div
          class="grid aspect-[5/4] grid-cols-[1.55fr_.8fr] gap-4 rounded-[18px] border border-white/16 bg-white/[.055] p-4 shadow-[0_24px_80px_rgb(0_0_0_/_20%)]"
        >
          <div class="relative grid place-items-center overflow-hidden rounded-[12px] bg-ink/45">
            <div
              class="grid h-16 w-16 place-items-center rounded-full border border-white/25 bg-white/10"
            >
              <span
                class="ml-1 h-0 w-0 border-y-[11px] border-l-[18px] border-y-transparent border-l-belt-light"
              />
            </div>
            <div
              class="absolute right-5 bottom-5 left-5 h-1.5 overflow-hidden rounded-full bg-white/16"
            >
              <span class="block h-full w-3/5 rounded-full bg-belt-light" />
            </div>
          </div>

          <div class="flex flex-col gap-3">
            <div
              v-for="lesson in 4"
              :key="lesson"
              :class="[
                'flex flex-1 items-center gap-3 rounded-[10px] border px-3',
                lesson === 1
                  ? 'border-belt-light/40 bg-belt-light/10'
                  : 'border-white/10 bg-white/[.035]',
              ]"
            >
              <span class="font-display text-xs font-extrabold text-belt-light">
                {{ String(lesson).padStart(2, "0") }}
              </span>
              <span class="space-y-2">
                <i class="block h-1.5 w-16 rounded-full bg-white/48" />
                <i class="block h-1.5 w-10 rounded-full bg-white/20" />
              </span>
            </div>
          </div>
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
