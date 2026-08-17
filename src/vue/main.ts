import { createApp } from "vue";

import App from "@/App.vue";
import "@/assets/tailwind.css";
import { authKey, createAuth } from "@/composables/useAuth.js";
import { confirmationKey, createConfirmation } from "@/composables/useConfirm.js";
import { createPwaInstall, pwaInstallKey } from "@/composables/usePwaInstall.js";
import { createToast, toastKey } from "@/composables/useToast.js";
import { showFrontendError } from "@/frontend-error.js";
import { router } from "@/router.js";

async function removeLegacyOfflineStorage(): Promise<void> {
  try {
    window.localStorage.removeItem("course:catalog-snapshot:v1");
  } catch {
    // Browser storage may be unavailable.
  }
  if ("caches" in window) {
    const cacheNames = await window.caches.keys();
    await Promise.all(cacheNames.map((cacheName) => window.caches.delete(cacheName)));
  }
  if ("serviceWorker" in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
  }
}

void removeLegacyOfflineStorage().catch(() => undefined);

const app = createApp(App);
const auth = createAuth();
const pwaInstall = createPwaInstall();
void auth.initialize();
pwaInstall.initialize();

app.provide(authKey, auth);
app.provide(confirmationKey, createConfirmation());
app.provide(pwaInstallKey, pwaInstall);
app.provide(toastKey, createToast());
app.config.errorHandler = (error, _instance, info) => {
  showFrontendError(error, window.location.href, info);
};
app.use(router).mount("#app");
app.onUnmount(auth.dispose);
app.onUnmount(pwaInstall.dispose);
