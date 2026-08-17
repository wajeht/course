import { createApp } from "vue";

import App from "@/App.vue";
import "@/assets/tailwind.css";
import { authKey, createAuth } from "@/composables/useAuth.js";
import { confirmationKey, createConfirmation } from "@/composables/useConfirm.js";
import { createPwaInstall, pwaInstallKey } from "@/composables/usePwaInstall.js";
import { createToast, toastKey } from "@/composables/useToast.js";
import { showFrontendError } from "@/frontend-error.js";
import { router } from "@/router.js";

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
