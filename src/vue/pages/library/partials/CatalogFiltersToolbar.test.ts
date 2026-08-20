// @vitest-environment happy-dom

import { DOMWrapper, mount, type VueWrapper } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";

import CatalogFiltersToolbar from "./CatalogFiltersToolbar.vue";

const catalogOptions = {
  categories: [
    { name: "Martial Arts", courseCount: 1 },
    { name: "Technology", courseCount: 2 },
  ],
  instructors: [{ name: "Author One", courseCount: 3 }],
  tags: [{ name: "Beginner", courseCount: 5 }],
};

const wrappers: VueWrapper[] = [];

afterEach(() => {
  for (const wrapper of wrappers) wrapper.unmount();
  wrappers.length = 0;
});

function mountToolbar() {
  const wrapper = mount(CatalogFiltersToolbar, {
    attachTo: document.body,
    props: {
      ...catalogOptions,
      category: [],
      instructor: [],
      query: "",
      tag: [],
    },
  });
  wrappers.push(wrapper);
  return wrapper;
}

describe("CatalogFiltersToolbar", () => {
  it("emits multiple desktop filter selections", async () => {
    const wrapper = mountToolbar();

    await wrapper.get('input[name="catalog-desktop-category"][value="Technology"]').setValue(true);
    expect(wrapper.emitted("update:category")?.at(-1)).toEqual([["Technology"]]);

    await wrapper.setProps({ category: ["Technology"] });
    await wrapper
      .get('input[name="catalog-desktop-category"][value="Martial Arts"]')
      .setValue(true);
    expect(wrapper.emitted("update:category")?.at(-1)).toEqual([["Technology", "Martial Arts"]]);
  });

  it("opens mobile filters in a modal drawer and exposes the active selection", async () => {
    const wrapper = mountToolbar();
    const categoryButton = wrapper.get('[data-mobile-filter="category"]');
    categoryButton.element.focus();

    await categoryButton.trigger("click");
    const drawer = document.body.querySelector("dialog[open]");
    expect(drawer).not.toBeNull();

    const technology = drawer?.querySelector<HTMLInputElement>(
      'input[name="catalog-mobile-category"][value="Technology"]',
    );
    expect(technology).not.toBeNull();
    await new DOMWrapper(technology!).setValue(true);
    expect(wrapper.emitted("update:category")?.at(-1)).toEqual([["Technology"]]);

    await wrapper.setProps({ category: ["Technology"] });
    expect(categoryButton.text()).toBe("Categories: Technology");

    const closeButton = drawer?.querySelector<HTMLButtonElement>(
      '[aria-label="Close categories filters"]',
    );
    expect(closeButton).not.toBeNull();
    await new DOMWrapper(closeButton!).trigger("click");
    expect(document.body.querySelector("dialog[open]")).toBeNull();
    expect(document.activeElement).toBe(categoryButton.element);
  });
});
