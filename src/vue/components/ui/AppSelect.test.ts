// @vitest-environment happy-dom

import { mount } from "@vue/test-utils";
import { defineComponent, ref } from "vue";
import { describe, expect, it } from "vitest";

import AppSelect from "./AppSelect.vue";

describe("AppSelect", () => {
  it("preserves typed option values", async () => {
    const Host = defineComponent({
      components: { AppSelect },
      setup: () => ({ rate: ref(1) }),
      template:
        '<AppSelect v-model="rate"><option :value="1">1x</option><option :value="2">2x</option></AppSelect>',
    });
    const wrapper = mount(Host);

    await wrapper.get("select").setValue("2");
    expect(wrapper.vm.rate).toBe(2);
  });
});
