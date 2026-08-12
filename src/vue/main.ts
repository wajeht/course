import { createApp } from "vue";

import App from "@/App.vue";
import "@/assets/tailwind.css";
import { authKey, createAuth } from "@/composables/useAuth.js";
import { confirmationKey, createConfirmation } from "@/composables/useConfirm.js";
import { createToast, toastKey } from "@/composables/useToast.js";
import { router } from "@/router.js";

const app = createApp(App);
const auth = createAuth();
void auth.initialize();

app.provide(authKey, auth);
app.provide(confirmationKey, createConfirmation());
app.provide(toastKey, createToast());
app.use(router).mount("#app");
app.onUnmount(auth.dispose);
