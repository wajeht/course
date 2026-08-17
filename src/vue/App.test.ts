// @vitest-environment happy-dom

import { mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import { afterEach, describe, expect, it, vi } from "vitest";

import App from "./App.vue";
import AuthGate from "./components/AuthGate.vue";
import { authKey, type AuthController } from "./composables/useAuth.js";
import { clearFrontendError, showFrontendError } from "./frontend-error.js";
import NotFoundPage from "./pages/NotFoundPage.vue";
import OfflinePage from "./pages/OfflinePage.vue";
import UnexpectedErrorPage from "./pages/UnexpectedErrorPage.vue";

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

async function mountAt(path: string, auth = createUnauthenticatedAuth()) {
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
      provide: { [authKey as symbol]: auth },
      stubs: {
        ConfirmDialog: true,
        ToastViewport: true,
      },
    },
  });
}

describe("App", () => {
  afterEach(() => {
    clearFrontendError();
    vi.restoreAllMocks();
  });

  it("shows the standalone 404 page to unauthenticated visitors", async () => {
    const wrapper = await mountAt("/missing-page");

    expect(wrapper.get("h1").text()).toBe("Page not found");
    expect(wrapper.get("main").classes()).toContain("min-h-screen");
    expect(wrapper.findComponent(AuthGate).exists()).toBe(false);
  });

  it("keeps authentication on valid protected routes", async () => {
    const wrapper = await mountAt("/settings");

    expect(wrapper.findComponent(AuthGate).exists()).toBe(true);
    expect(wrapper.text()).toContain("Please sign in to continue.");
    expect(wrapper.findComponent(NotFoundPage).exists()).toBe(false);
  });

  it("shows frontend errors outside authentication and global overlays", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    showFrontendError(new Error("boom"), "/settings", "test");

    const wrapper = await mountAt("/settings");

    expect(wrapper.findComponent(UnexpectedErrorPage).exists()).toBe(true);
    expect(wrapper.get("main").classes()).toContain("min-h-screen");
    expect(wrapper.findComponent(AuthGate).exists()).toBe(false);
    expect(wrapper.find("confirm-dialog-stub").exists()).toBe(false);
    expect(wrapper.find("toast-viewport-stub").exists()).toBe(false);
  });

  it("shows connection recovery for valid routes when the session cannot be checked", async () => {
    const auth = createUnauthenticatedAuth();
    Object.assign(auth.state, { error: "Failed to fetch", status: "error" });

    const wrapper = await mountAt("/settings", auth);

    expect(wrapper.findComponent(OfflinePage).exists()).toBe(true);
    expect(wrapper.get("h1").text()).toBe("Course is offline");
    expect(wrapper.findComponent(AuthGate).exists()).toBe(false);
  });
});
