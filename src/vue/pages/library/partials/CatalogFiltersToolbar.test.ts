// @vitest-environment happy-dom

import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import CatalogFiltersToolbar from "./CatalogFiltersToolbar.vue";

const catalogOptions = {
  categories: [
    { name: "Martial Arts", courseCount: 1 },
    { name: "Technology", courseCount: 2 },
  ],
  instructors: [{ name: "Author One", courseCount: 3 }],
  tags: [{ name: "Beginner", courseCount: 5 }],
};

function mountToolbar() {
  return mount(CatalogFiltersToolbar, {
    props: {
      ...catalogOptions,
      category: [],
      instructor: [],
      query: "",
      tag: [],
    },
  });
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

  it("shows mobile filters inline and exposes the active selection", async () => {
    const wrapper = mountToolbar();
    const categoryButton = wrapper.get('[data-mobile-filter="category"]');

    await categoryButton.trigger("click");
    expect(wrapper.find("[data-mobile-filter-panel]").exists()).toBe(true);
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false);

    await wrapper.get('input[name="catalog-mobile-category"][value="Technology"]').setValue(true);
    expect(wrapper.emitted("update:category")?.at(-1)).toEqual([["Technology"]]);

    await wrapper.setProps({ category: ["Technology"] });
    expect(categoryButton.text()).toBe("Categories: Technology");
  });
});
