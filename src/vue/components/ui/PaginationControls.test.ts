// @vitest-environment happy-dom

import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import PaginationControls from "./PaginationControls.vue";

describe("PaginationControls", () => {
  it("emits valid adjacent pages", async () => {
    const wrapper = mount(PaginationControls, { props: { page: 2, totalPages: 3 } });

    await wrapper.get("button:first-of-type").trigger("click");
    await wrapper.get("button:last-of-type").trigger("click");

    expect(wrapper.emitted("change")).toEqual([[1], [3]]);
  });
});
