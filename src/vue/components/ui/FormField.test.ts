// @vitest-environment happy-dom

import { mount } from "@vue/test-utils";
import { defineComponent } from "vue";
import { describe, expect, it } from "vitest";

import AppInput from "./AppInput.vue";
import FormField from "./FormField.vue";

describe("FormField", () => {
  it("connects labels, help text, errors, and invalid state", () => {
    const Host = defineComponent({
      components: { AppInput, FormField },
      template: `
        <FormField label="Password" help-text="At least eight characters" error="Too short" v-slot="field">
          <AppInput :id="field.inputId" :aria-describedby="field.describedBy" :invalid="field.invalid" />
        </FormField>
      `,
    });
    const wrapper = mount(Host);
    const input = wrapper.get("input");

    expect(wrapper.get("label").attributes("for")).toBe(input.attributes("id"));
    expect(input.attributes("aria-invalid")).toBe("true");
    const describedBy = input.attributes("aria-describedby")?.split(" ") ?? [];
    expect(describedBy).toHaveLength(2);
    expect(describedBy.every((id) => wrapper.find(`#${id}`).exists())).toBe(true);
  });
});
