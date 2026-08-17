// @vitest-environment happy-dom

import { mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter, type RouteRecordRaw } from "vue-router";
import { describe, expect, it } from "vitest";

import AppShell from "./AppShell.vue";

const routes: RouteRecordRaw[] = [
  { path: "/", component: { template: "<div />" }, meta: { navigation: "home" } },
  {
    path: "/library",
    component: { template: "<div />" },
    meta: { navigation: "library" },
  },
  {
    path: "/settings",
    component: { template: "<div />" },
    meta: { navigation: "settings" },
  },
  { path: "/missing", component: { template: "<div />" } },
];

async function mountShell(path: string) {
  const router = createRouter({ history: createMemoryHistory(), routes });
  await router.push(path);
  await router.isReady();
  return mount(AppShell, { global: { plugins: [router] } });
}

describe("AppShell", () => {
  it("renders desktop and mobile primary navigation with the current tab selected", async () => {
    const wrapper = await mountShell("/settings");
    const desktopNavigation = wrapper.get('nav[aria-label="Main navigation"]');
    const mobileNavigation = wrapper.get('nav[aria-label="Mobile navigation"]');

    expect(desktopNavigation.classes()).toContain("max-[600px]:hidden");
    expect(mobileNavigation.classes()).toContain("max-[600px]:grid");
    expect(wrapper.get("header").text()).toContain("Course");
    expect(wrapper.get("header a > span > span:last-child").classes()).not.toContain(
      "max-[600px]:hidden",
    );
    expect(mobileNavigation.findAll("svg")).toHaveLength(0);
    expect(mobileNavigation.findAll("a")).toHaveLength(3);
    expect(mobileNavigation.get('a[href="/settings"]').attributes("aria-current")).toBe("page");
    expect(mobileNavigation.get('a[href="/"]').attributes("aria-current")).toBeUndefined();
    expect(mobileNavigation.get('a[href="/library"]').attributes("aria-current")).toBeUndefined();
  });

  it("selects the library navigation on the library page", async () => {
    const wrapper = await mountShell("/library");
    const mobileNavigation = wrapper.get('nav[aria-label="Mobile navigation"]');

    expect(mobileNavigation.get('a[href="/library"]').attributes("aria-current")).toBe("page");
    expect(mobileNavigation.get('a[href="/"]').attributes("aria-current")).toBeUndefined();
  });

  it("does not select a navigation item on an error page", async () => {
    const wrapper = await mountShell("/missing");
    const mobileNavigation = wrapper.get('nav[aria-label="Mobile navigation"]');

    expect(
      mobileNavigation.findAll("a").every((link) => link.attributes("aria-current") === undefined),
    ).toBe(true);
  });
});
