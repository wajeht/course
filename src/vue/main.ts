import { VueQueryPlugin } from "@tanstack/vue-query";
import { createApp, watch } from "vue";

import App from "@/App.vue";
import "@/assets/tailwind.css";
import { authKey, createAuth } from "@/composables/useAuth.js";
import { confirmationKey, createConfirmation } from "@/composables/useConfirm.js";
import { createToast, toastKey } from "@/composables/useToast.js";
import { showFrontendError } from "@/frontend-error.js";
import { resetImagePrefetch } from "@/imagePrefetch.js";
import { createVideosQueryClient } from "@/queries.js";
import { router } from "@/router.js";

const app = createApp(App);
const auth = createAuth({ onSessionChange: resetImagePrefetch });
const queryClient = createVideosQueryClient();
void auth.initialize();

watch(
  () => auth.state.status,
  (status) => {
    if (status !== "authenticated") queryClient.clear();
  },
);

app.provide(authKey, auth);
app.provide(confirmationKey, createConfirmation());
app.provide(toastKey, createToast());
app.config.errorHandler = (error, _instance, info) => {
  showFrontendError(error, window.location.href, info);
};
app.use(VueQueryPlugin, { queryClient });
app.use(router).mount("#app");
app.onUnmount(auth.dispose);
