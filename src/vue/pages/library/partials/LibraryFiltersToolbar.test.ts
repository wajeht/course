// @vitest-environment happy-dom

import { DOMWrapper, mount, type VueWrapper } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";

import LibraryFiltersToolbar from "./LibraryFiltersToolbar.vue";

const wrappers: VueWrapper[] = [];

afterEach(() => {
  for (const wrapper of wrappers) wrapper.unmount();
  wrappers.length = 0;
});

function mountToolbar() {
  const wrapper = mount(LibraryFiltersToolbar, {
    attachTo: document.body,
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
  return wrapper;
}

describe("LibraryFiltersToolbar", () => {
  it("places mobile filter actions after search and opens the author drawer", async () => {
    const wrapper = mountToolbar();
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
    const wrapper = mountToolbar();

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
});
