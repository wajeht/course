// @vitest-environment happy-dom

import { DOMWrapper, mount, type VueWrapper } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";

import CatalogFiltersToolbar from "./CatalogFiltersToolbar.vue";

const catalogOptions = {
  categories: [
    { name: "Martial Arts", courseCount: 1 },
    { name: "Technology", courseCount: 2 },
  ],
  authors: [{ name: "Author One", courseCount: 3 }],
  tags: [{ name: "Beginner", courseCount: 5 }],
};

type ToolbarProps = typeof catalogOptions & {
  category: string[];
  hasActiveFilters: boolean;
  author: string[];
  query: string;
  tag: string[];
};

const wrappers: VueWrapper[] = [];

afterEach(() => {
  for (const wrapper of wrappers) wrapper.unmount();
  wrappers.length = 0;
});

function mountToolbar(overrides: Partial<ToolbarProps> = {}) {
  const wrapper = mount(CatalogFiltersToolbar, {
    attachTo: document.body,
    props: {
      ...catalogOptions,
      category: [],
      hasActiveFilters: false,
      author: [],
      query: "",
      tag: [],
      ...overrides,
    },
  });
  wrappers.push(wrapper);
  return wrapper;
}

describe("CatalogFiltersToolbar", () => {
  it("uses the strong pine color for desktop filter headings", () => {
    const wrapper = mountToolbar();
    const headings = wrapper.findAll("legend").filter((legend) => !legend.classes("sr-only"));

    expect(headings).toHaveLength(3);
    expect(headings.every((heading) => heading.classes("text-pine"))).toBe(true);
    expect(headings.every((heading) => !heading.classes("text-muted"))).toBe(true);
  });

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
    (categoryButton.element as HTMLElement).focus();

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
    expect(categoryButton.text()).toBe("Category: Technology");

    const closeButton = drawer?.querySelector<HTMLButtonElement>(
      '[aria-label="Close category filters"]',
    );
    expect(closeButton).not.toBeNull();
    await new DOMWrapper(closeButton!).trigger("click");
    expect(document.body.querySelector("dialog[open]")).toBeNull();
    expect(document.activeElement).toBe(categoryButton.element);
  });

  it("emits one clear action when active filters are present", async () => {
    const wrapper = mountToolbar({ hasActiveFilters: true });

    await wrapper.get('[data-clear-filters="desktop"]').trigger("click");

    expect(wrapper.emitted("clear")).toEqual([[]]);
  });

  it("keeps a selected tag visible while the desktop tag list is collapsed", async () => {
    const tags = Array.from({ length: 12 }, (_, index) => ({
      name: `Tag ${index + 1}`,
      courseCount: index + 1,
    }));
    const wrapper = mountToolbar({ hasActiveFilters: true, tag: ["Tag 12"], tags });
    const desktopTags = () => wrapper.findAll('input[name="catalog-desktop-tag"]');

    expect(desktopTags()).toHaveLength(11);
    expect(desktopTags().map((input) => input.attributes("value"))).toContain("Tag 12");

    const showAll = wrapper
      .findAll("button")
      .find((button) => button.text() === "Show all 12 tags");
    expect(showAll).toBeDefined();
    await showAll!.trigger("click");

    expect(desktopTags()).toHaveLength(12);
    expect(showAll!.text()).toBe("Show fewer tags");
  });
});
