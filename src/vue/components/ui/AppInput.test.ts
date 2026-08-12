// @vitest-environment happy-dom

import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import AppInput from "./AppInput.vue";

describe("AppInput", () => {
  it("updates its model and toggles password visibility", async () => {
    const wrapper = mount(AppInput, { props: { modelValue: "secret", type: "password" } });
    const input = wrapper.get("input");

    expect(input.attributes("type")).toBe("password");
    await wrapper.get("button").trigger("click");
    expect(input.attributes("type")).toBe("text");
    await input.setValue("new secret");
    expect(wrapper.emitted("update:modelValue")?.at(-1)).toEqual(["new secret"]);
  });
});
