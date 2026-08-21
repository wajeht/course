<script setup lang="ts">
import { computed, onBeforeUnmount, shallowRef, watch } from "vue";
import { RouterView, useRoute } from "vue-router";

import OfflineStatusBanner from "@/components/OfflineStatusBanner.vue";
import AppLogo from "@/components/ui/AppLogo.vue";
import ConfirmDialog from "@/components/ui/ConfirmDialog.vue";
import ToastViewport from "@/components/ui/ToastViewport.vue";
import { useAsyncAction } from "@/composables/useAsyncAction.js";
import { useAuth } from "@/composables/useAuth.js";
import { useNetworkStatus } from "@/composables/useNetworkStatus.js";
import { frontendError } from "@/frontend-error.js";
import AppShell from "@/layouts/AppShell.vue";
import AuthPage from "@/pages/auth/AuthPage.vue";
import OfflinePage from "@/pages/OfflinePage.vue";
import UnexpectedErrorPage from "@/pages/UnexpectedErrorPage.vue";
import { setPageTitle } from "@/utils.js";

const auth = useAuth();
const route = useRoute();
const { online } = useNetworkStatus();
const loginAction = useAsyncAction((password: string) => auth.login(password), {
  errorMessage: "Could not sign in",
});
const setupAction = useAsyncAction(
  (password: string, confirmPassword: string, setupToken?: string) =>
    auth.setupPassword(password, confirmPassword, setupToken),
  { errorMessage: "Could not create the library password" },
);
const authBusy = computed(() => loginAction.pending.value || setupAction.pending.value);
const actionError = computed(
  () => loginAction.errorMessage.value || setupAction.errorMessage.value,
);
const showBootstrap = shallowRef(false);
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
watch(online, (isOnline) => {
  if (isOnline && auth.state.status === "error") void auth.initialize();
});
watch(
  [() => auth.state.status, () => route.name, () => route.meta.title, () => frontendError.visible],
  ([status, routeName, routeTitle, hasFrontendError]) => {
    if (hasFrontendError) return;
    if (routeName === "not-found") {
      setPageTitle(routeTitle);
      return;
    }
    if (status === "error") {
      setPageTitle("Connection unavailable");
      return;
    }
    if (status !== "loading") setPageTitle(routeTitle);
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
  <UnexpectedErrorPage v-if="frontendError.visible" />
  <main
    v-else-if="auth.state.status === 'loading'"
    class="grid min-h-screen place-items-center bg-canvas px-5"
  >
    <div v-if="showBootstrap" class="text-center text-pine-deep" role="status">
      <AppLogo />
      <p class="mt-3 text-sm text-muted">Opening Videos…</p>
    </div>
  </main>
  <AppShell v-else-if="auth.state.status === 'authenticated'">
    <OfflineStatusBanner v-if="!online" />
    <RouterView />
  </AppShell>
  <RouterView v-else-if="route.name === 'not-found'" v-slot="{ Component }">
    <component :is="Component" standalone />
  </RouterView>
  <OfflinePage v-else-if="auth.state.status === 'error'" @retry="auth.initialize" />
  <AuthPage
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
  <ConfirmDialog v-if="!frontendError.visible" />
  <ToastViewport v-if="!frontendError.visible" />
</template>
