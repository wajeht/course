import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { createApp } from "vue";

import App from "./App.vue";
import { ApiError } from "./api";
import "./assets/tailwind.css";
import { router } from "./router";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry(failureCount, error) {
        if (failureCount >= 2) return false;
        return !(error instanceof ApiError) || error.status >= 500;
      },
      retryDelay: (attempt) => Math.min(500 * 2 ** attempt, 4_000),
    },
    mutations: { retry: false },
  },
});

createApp(App).use(router).use(VueQueryPlugin, { queryClient }).mount("#app");
