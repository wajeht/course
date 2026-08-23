// @vitest-environment happy-dom

import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { DOMWrapper, flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import { afterEach, describe, expect, it, vi } from "vitest";

import { api } from "@/api.js";

import LibraryFiltersToolbar from "./LibraryFiltersToolbar.vue";

vi.mock("@/api.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api.js")>();
  return {
    ...actual,
    api: {
      ...actual.api,
      getSettings: vi.fn(async () => ({ libraryPageSize: 24 })),
      updateSettings: vi.fn(async (libraryPageSize) => ({ libraryPageSize })),
    },
  };
});

const wrappers: VueWrapper[] = [];

afterEach(() => {
  for (const wrapper of wrappers) wrapper.unmount();
  wrappers.length = 0;
  vi.mocked(api.getSettings).mockClear();
  vi.mocked(api.updateSettings).mockClear();
});

async function mountToolbar() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/videos", component: { template: "<div />" } }],
  });
  await router.push("/videos");
  await router.isReady();
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = mount(LibraryFiltersToolbar, {
    attachTo: document.body,
    global: { plugins: [[VueQueryPlugin, { queryClient }], router] },
    props: {
      author: [],
      authors: [{ name: "Example Author", videoCount: 3 }],
      hasActiveFilters: false,
      query: "",
      tag: [],
      tags: [{ name: "Example Tag", videoCount: 2 }],
      view: "videos",
    },
  });
  wrappers.push(wrapper);
  await flushPromises();
  return wrapper;
}

describe("LibraryFiltersToolbar", () => {
  it("places mobile filter actions after search and opens the author drawer", async () => {
    const wrapper = await mountToolbar();
    const search = wrapper.get('[data-testid="mobile-library-search"]');
    const actions = wrapper.get('[data-testid="mobile-filter-actions"]');
    const viewButton = wrapper.get('[data-mobile-filter="view"]');

    expect(
      search.element.compareDocumentPosition(actions.element) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(viewButton.classes()).toEqual(expect.arrayContaining(["bg-pine", "text-white"]));

    const authorButton = wrapper.get('[data-mobile-filter="author"]');
    expect(authorButton.classes()).toEqual(expect.arrayContaining(["bg-white", "text-pine"]));
    await authorButton.trigger("click");

    const drawer = document.body.querySelector("dialog[open]");
    expect(drawer?.getAttribute("aria-labelledby")).toBeTruthy();

    const author = drawer?.querySelector<HTMLInputElement>(
      'input[name="library-mobile-author"][value="Example Author"]',
    );
    expect(author).not.toBeNull();
    await new DOMWrapper(author!).setValue(true);

    expect(wrapper.emitted("update:author")?.at(-1)).toEqual([["Example Author"]]);

    await wrapper.setProps({ author: ["Example Author"] });
    expect(authorButton.text()).toBe("Authors: Example Author");
    expect(authorButton.classes()).toEqual(expect.arrayContaining(["bg-pine", "text-white"]));
  });

  it("switches the mobile view through the drawer", async () => {
    const wrapper = await mountToolbar();

    await wrapper.get('[data-mobile-filter="view"]').trigger("click");

    const playlists = document.body.querySelector<HTMLInputElement>(
      'dialog[open] input[name="library-mobile-view"][value="playlists"]',
    );
    expect(playlists).not.toBeNull();
    await new DOMWrapper(playlists!).setValue();

    expect(wrapper.emitted("update:view")?.at(-1)).toEqual(["playlists"]);
    await wrapper.setProps({ view: "playlists" });
    const viewButton = wrapper.get('[data-mobile-filter="view"]');
    expect(viewButton.text()).toBe("Playlists");
    expect(viewButton.classes()).toEqual(expect.arrayContaining(["bg-pine", "text-white"]));
  });

  it("saves videos per page when a desktop option is chosen", async () => {
    const wrapper = await mountToolbar();
    const current = wrapper.get<HTMLInputElement>(
      'input[name="library-desktop-page-size"][value="24"]',
    );
    const next = wrapper.get('input[name="library-desktop-page-size"][value="48"]');

    expect(current.element.checked).toBe(true);
    await next.setValue();
    await flushPromises();

    expect(api.updateSettings).toHaveBeenCalledWith(48);
  });

  it("opens videos per page in the mobile sheet and saves on select", async () => {
    const wrapper = await mountToolbar();

    await wrapper.get('[data-mobile-filter="pageSize"]').trigger("click");
    const option = document.body.querySelector<HTMLInputElement>(
      'dialog[open] input[name="library-mobile-page-size"][value="12"]',
    );
    expect(option).not.toBeNull();
    await new DOMWrapper(option!).setValue();
    await flushPromises();

    expect(api.updateSettings).toHaveBeenCalledWith(12);
    expect(wrapper.get('[data-mobile-filter="pageSize"]').text()).toBe("12 per page");
  });
});
