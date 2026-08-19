// @vitest-environment happy-dom

import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";

import PaginationControls from "./PaginationControls.vue";

afterEach(() => {
  vi.useRealTimers();
});

describe("PaginationControls", () => {
  it("emits valid adjacent pages", async () => {
    const wrapper = mount(PaginationControls, { props: { page: 2, totalPages: 3 } });

    await wrapper.get("button:first-of-type").trigger("click");
    await wrapper.get("button:last-of-type").trigger("click");

    expect(wrapper.emitted("change")).toEqual([[1], [3]]);
  });

  it("prefetches a valid adjacent page after hover intent", async () => {
    vi.useFakeTimers();
    const wrapper = mount(PaginationControls, { props: { page: 2, totalPages: 3 } });

    await wrapper.get("button:last-of-type").trigger("pointerenter");
    await vi.advanceTimersByTimeAsync(80);

    expect(wrapper.emitted("prefetch")).toEqual([[3]]);
  });
});
