// @vitest-environment happy-dom

import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { createMemoryHistory, createRouter, type RouteRecordRaw } from "vue-router";
import { afterEach, describe, expect, it, vi } from "vitest";

import AppShell from "./AppShell.vue";

const routes: RouteRecordRaw[] = [
  { path: "/", component: { template: "<div />" }, meta: { navigation: "home" } },
  {
    path: "/videos",
    component: { template: "<div />" },
    meta: { navigation: "videos" },
  },
  {
    path: "/settings/library",
    component: { template: "<div />" },
    meta: { navigation: "settings" },
  },
  { path: "/missing", component: { template: "<div />" } },
];
const wrappers: VueWrapper[] = [];

afterEach(() => {
  for (const wrapper of wrappers) wrapper.unmount();
  wrappers.length = 0;
  vi.unstubAllGlobals();
});

function useViewport(desktop: boolean): void {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      addEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
      matches: query === "(min-width: 601px)" && desktop,
      media: query,
      onchange: null,
      removeEventListener: vi.fn(),
    })),
  );
}

async function mountShell(path: string, desktop = true) {
  useViewport(desktop);
  const router = createRouter({ history: createMemoryHistory(), routes });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await router.push(path);
  await router.isReady();
  const wrapper = mount(AppShell, {
    global: { plugins: [[VueQueryPlugin, { queryClient }], router] },
  });
  wrappers.push(wrapper);
  await flushPromises();
  return wrapper;
}

describe("AppShell", () => {
  it("renders desktop and mobile primary navigation with the current tab selected", async () => {
    const wrapper = await mountShell("/settings/library");
    const desktopNavigation = wrapper.get('nav[aria-label="Main navigation"]');
    const mobileNavigation = wrapper.get('nav[aria-label="Mobile navigation"]');

    expect(desktopNavigation.classes()).toContain("max-[600px]:hidden");
    expect(mobileNavigation.classes()).toContain("max-[600px]:grid");
    expect(wrapper.get("header").text()).toContain("Videos");
    expect(wrapper.find('header button[aria-label="Search videos"]').exists()).toBe(false);
    expect(document.body.querySelector('dialog[aria-label="Search videos"]')).toBeTruthy();
    expect(wrapper.get("header a > span > span:last-child").classes()).not.toContain(
      "max-[600px]:hidden",
    );
    expect(mobileNavigation.findAll("svg")).toHaveLength(0);
    expect(mobileNavigation.findAll("a")).toHaveLength(3);
    expect(mobileNavigation.get('a[href="/settings/library"]').attributes("aria-current")).toBe(
      "page",
    );
    expect(mobileNavigation.get('a[href="/"]').attributes("aria-current")).toBeUndefined();
    expect(mobileNavigation.get('a[href="/videos"]').attributes("aria-current")).toBeUndefined();
  });

  it("selects the videos navigation on the videos page", async () => {
    const wrapper = await mountShell("/videos");
    const mobileNavigation = wrapper.get('nav[aria-label="Mobile navigation"]');

    expect(mobileNavigation.get('a[href="/videos"]').attributes("aria-current")).toBe("page");
    expect(mobileNavigation.get('a[href="/"]').attributes("aria-current")).toBeUndefined();
  });

  it("does not mount global search on mobile", async () => {
    await mountShell("/videos", false);

    expect(document.body.querySelector('dialog[aria-label="Search videos"]')).toBeNull();
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true, cancelable: true }),
    );
    await flushPromises();
    expect(document.body.querySelector('dialog[aria-label="Search videos"]')).toBeNull();
  });

  it("does not select a navigation item on an error page", async () => {
    const wrapper = await mountShell("/missing");
    const mobileNavigation = wrapper.get('nav[aria-label="Mobile navigation"]');

    expect(
      mobileNavigation.findAll("a").every((link) => link.attributes("aria-current") === undefined),
    ).toBe(true);
  });
});
