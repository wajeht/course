// @vitest-environment happy-dom

import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import PlayerProgressMenu from "./PlayerProgressMenu.vue";

describe("PlayerProgressMenu", () => {
  it("keeps reset progress in an overflow menu", async () => {
    const wrapper = mount(PlayerProgressMenu, {
      props: { label: "Video actions", resetLabel: "Reset progress", resetting: false },
    });
    const trigger = wrapper.get('[aria-label="Video actions"]');

    expect(trigger.attributes("aria-expanded")).toBe("false");
    expect(wrapper.find('[role="menu"]').exists()).toBe(false);

    await trigger.trigger("click");

    expect(trigger.attributes("aria-expanded")).toBe("true");
    expect(wrapper.get('[role="menuitem"]').text()).toBe("Reset progress");

    await wrapper.get('[role="menuitem"]').trigger("click");

    expect(wrapper.emitted("reset")).toHaveLength(1);
    expect(wrapper.find('[role="menu"]').exists()).toBe(false);
  });
});
