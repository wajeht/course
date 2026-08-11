<script setup lang="ts">
import { onMounted, ref } from "vue";
import { RouterView } from "vue-router";

import AuthGate from "./components/AuthGate.vue";
import PwaUpdatePrompt from "./components/PwaUpdatePrompt.vue";
import { useAuth } from "./composables/useAuth.js";
import AppShell from "./layouts/AppShell.vue";

const auth = useAuth();
const actionError = ref("");
const authBusy = ref(false);

onMounted(() => void auth.initialize());

async function login(password: string): Promise<void> {
  actionError.value = "";
  authBusy.value = true;
  try {
    await auth.login(password);
  } catch (error) {
    actionError.value = error instanceof Error ? error.message : "Could not sign in";
  } finally {
    authBusy.value = false;
  }
}

async function setup(
  password: string,
  confirmPassword: string,
  setupToken?: string,
): Promise<void> {
  actionError.value = "";
  authBusy.value = true;
  try {
    await auth.setupPassword(password, confirmPassword, setupToken);
  } catch (error) {
    actionError.value = error instanceof Error ? error.message : "Could not configure password";
  } finally {
    authBusy.value = false;
  }
}
</script>

<template>
  <AppShell v-if="auth.state.status === 'authenticated'">
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
</template>
