import { createApp } from "vue";

import App from "./App.vue";
import "./assets/tailwind.css";
import { useAuth } from "./composables/useAuth.js";
import { router } from "./router.js";

const auth = useAuth();
await auth.initialize();

createApp(App).use(router).mount("#app");
