<script setup lang="ts">
import { computed } from "vue";

import type { AuthStatus } from "@/composables/useAuth.js";
import AppButton from "@/components/ui/AppButton.vue";
import AppFooter from "@/components/ui/AppFooter.vue";
import AppLogo from "@/components/ui/AppLogo.vue";
import PanelCard from "@/components/ui/PanelCard.vue";
import AuthForm from "@/pages/auth/partials/AuthForm.vue";

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

const isSetup = computed(() => !props.passwordConfigured);

function forwardSetup(password: string, confirmPassword: string, setupToken?: string): void {
  emit("setup", password, confirmPassword, setupToken);
}
</script>

<template>
  <main class="min-h-screen bg-canvas lg:grid lg:grid-cols-[1fr_2fr]">
    <aside
      class="hidden min-h-screen items-center justify-center overflow-hidden bg-pine-deep bg-[radial-gradient(circle_at_83%_20%,rgb(196_147_63_/_16%),transparent_30%),repeating-linear-gradient(90deg,transparent_0_52px,rgb(255_255_255_/_2%)_52px_53px)] px-12 text-white lg:order-2 lg:flex"
      aria-label="A private, opinionated, self-hosted video course library."
    >
      <div class="w-full max-w-[720px]" aria-hidden="true">
        <p
          class="font-display text-[clamp(4rem,6.4vw,8rem)] font-black leading-[0.82] tracking-[-0.025em] uppercase"
        >
          <span class="block text-white/45">A private,</span>
          <span class="block text-white">opinionated,</span>
          <span class="block text-belt-light">self-hosted</span>
        </p>
        <p class="mt-8 max-w-xl text-xl font-medium tracking-[0.12em] text-white/60 uppercase">
          Video course library.
        </p>
      </div>
    </aside>

    <section
      class="grid min-h-screen grid-rows-[1fr_auto] px-5 py-8 lg:order-1 lg:grid-rows-[auto_1fr_auto] lg:border-r lg:border-pine/10 lg:px-8 lg:py-10 xl:px-[clamp(36px,3.5vw,60px)]"
    >
      <div class="hidden text-pine-deep lg:block">
        <AppLogo />
      </div>

      <PanelCard
        class="w-full max-w-[430px] place-self-center lg:max-w-[420px] lg:overflow-visible lg:rounded-none lg:border-0 lg:bg-transparent lg:shadow-none"
        padding="none"
      >
        <header class="bg-pine-deep px-8 py-7 text-white lg:hidden">
          <AppLogo />
          <p class="mt-3 text-sm leading-6 text-white/68">
            {{
              isSetup
                ? "Create the password that protects your private course library."
                : "Please sign in to continue."
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

        <AuthForm
          v-else
          :busy
          :is-setup="isSetup"
          :message
          :setup-token-required
          @login="emit('login', $event)"
          @setup="forwardSetup"
        />
      </PanelCard>

      <AppFooter class="mt-8 place-self-center" />
    </section>
  </main>
</template>
