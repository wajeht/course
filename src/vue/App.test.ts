// @vitest-environment happy-dom

import { mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import { describe, expect, it, vi } from "vitest";

import App from "./App.vue";
import AuthGate from "./components/AuthGate.vue";
import { authKey, type AuthController } from "./composables/useAuth.js";
import NotFoundPage from "./pages/NotFoundPage.vue";

function createUnauthenticatedAuth(): AuthController {
  return {
    changePassword: vi.fn(),
    dispose: vi.fn(),
    initialize: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    setupPassword: vi.fn(),
    state: {
      error: "",
      passwordConfigured: true,
      setupEnabled: false,
      setupTokenRequired: false,
      status: "unauthenticated",
    },
  };
}

async function mountAt(path: string) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/settings", name: "settings", component: { template: "<div />" } },
      { path: "/:pathMatch(.*)*", name: "not-found", component: NotFoundPage },
    ],
  });
  await router.push(path);
  await router.isReady();

  return mount(App, {
    global: {
      plugins: [router],
      provide: { [authKey as symbol]: createUnauthenticatedAuth() },
      stubs: {
        ConfirmDialog: true,
        PwaUpdatePrompt: true,
        ToastViewport: true,
      },
    },
  });
}

describe("App", () => {
  it("shows the standalone 404 page to unauthenticated visitors", async () => {
    const wrapper = await mountAt("/missing-page");

    expect(wrapper.get("h1").text()).toBe("Page not found");
    expect(wrapper.get("main").classes()).toContain("min-h-screen");
    expect(wrapper.findComponent(AuthGate).exists()).toBe(false);
  });

  it("keeps authentication on valid protected routes", async () => {
    const wrapper = await mountAt("/settings");

    expect(wrapper.findComponent(AuthGate).exists()).toBe(true);
    expect(wrapper.findComponent(NotFoundPage).exists()).toBe(false);
  });
});
