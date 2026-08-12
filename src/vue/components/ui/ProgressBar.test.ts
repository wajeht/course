// @vitest-environment happy-dom

import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import ProgressBar from "./ProgressBar.vue";

describe("ProgressBar", () => {
  it("clamps visual progress while preserving the accessible value", () => {
    const wrapper = mount(ProgressBar, { props: { value: 120 } });

    expect(wrapper.find('[style*="width"]').attributes("style")).toContain("width: 100%");
    expect(wrapper.text()).toContain("Course progress: 120%");
  });
});
