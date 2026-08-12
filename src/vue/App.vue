<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { RouterView } from "vue-router";

import AuthGate from "@/components/AuthGate.vue";
import PwaUpdatePrompt from "@/components/PwaUpdatePrompt.vue";
import AppLogo from "@/components/ui/AppLogo.vue";
import ConfirmDialog from "@/components/ui/ConfirmDialog.vue";
import ToastViewport from "@/components/ui/ToastViewport.vue";
import { useAsyncAction } from "@/composables/useAsyncAction.js";
import { useAuth } from "@/composables/useAuth.js";
import AppShell from "@/layouts/AppShell.vue";

const auth = useAuth();
const loginAction = useAsyncAction((password: string) => auth.login(password), {
  errorMessage: "Could not sign in",
});
const setupAction = useAsyncAction(
  (password: string, confirmPassword: string, setupToken?: string) =>
    auth.setupPassword(password, confirmPassword, setupToken),
  { errorMessage: "Could not configure password" },
);
const authBusy = computed(() => loginAction.pending.value || setupAction.pending.value);
const actionError = computed(
  () => loginAction.errorMessage.value || setupAction.errorMessage.value,
);
const showBootstrap = ref(false);
let bootstrapTimer: ReturnType<typeof setTimeout> | undefined;

watch(
  () => auth.state.status,
  (status) => {
    clearTimeout(bootstrapTimer);
    showBootstrap.value = false;
    if (status === "loading") {
      bootstrapTimer = setTimeout(() => {
        showBootstrap.value = true;
      }, 250);
    }
  },
  { immediate: true },
);
onBeforeUnmount(() => clearTimeout(bootstrapTimer));

async function login(password: string): Promise<void> {
  setupAction.clearError();
  await loginAction.run(password);
}

async function setup(
  password: string,
  confirmPassword: string,
  setupToken?: string,
): Promise<void> {
  loginAction.clearError();
  await setupAction.run(password, confirmPassword, setupToken);
}
</script>

<template>
  <main
    v-if="auth.state.status === 'loading'"
    class="grid min-h-screen place-items-center bg-canvas px-5"
  >
    <div v-if="showBootstrap" class="text-center text-pine-deep" role="status">
      <AppLogo />
      <p class="mt-3 text-sm text-muted">Opening Course…</p>
    </div>
  </main>
  <AppShell v-else-if="auth.state.status === 'authenticated'">
    <RouterView />
  </AppShell>
  <AuthGate
    v-else
    :status="auth.state.status"
    :password-configured="auth.state.passwordConfigured"
    :setup-enabled="auth.state.setupEnabled"
    :setup-token-required="auth.state.setupTokenRequired"
    :busy="authBusy"
    :message="actionError || auth.state.error"
    @login="login"
    @setup="setup"
    @retry="auth.initialize"
  />
  <PwaUpdatePrompt />
  <ConfirmDialog />
  <ToastViewport />
</template>
