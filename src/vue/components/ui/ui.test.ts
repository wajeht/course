// @vitest-environment happy-dom

import { mount } from "@vue/test-utils";
import { defineComponent, nextTick, ref } from "vue";
import { afterEach, describe, expect, it } from "vitest";

import AlertMessage from "./AlertMessage.vue";
import AppButton from "./AppButton.vue";
import AppInput from "./AppInput.vue";
import AppLogo from "./AppLogo.vue";
import AppModal from "./AppModal.vue";
import AppSelect from "./AppSelect.vue";
import EmptyState from "./EmptyState.vue";
import FormField from "./FormField.vue";
import PanelCard from "./PanelCard.vue";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("AppButton", () => {
  it("defaults to a safe button and emits clicks", async () => {
    const wrapper = mount(AppButton, { slots: { default: "Save" } });

    expect(wrapper.element.tagName).toBe("BUTTON");
    expect(wrapper.attributes("type")).toBe("button");
    await wrapper.trigger("click");
    expect(wrapper.emitted("click")).toHaveLength(1);
  });

  it("blocks interactions and announces progress while loading", async () => {
    const wrapper = mount(AppButton, {
      props: { loading: true, loadingLabel: "Saving…" },
      slots: { default: "Save" },
    });

    expect(wrapper.attributes("disabled")).toBeDefined();
    expect(wrapper.attributes("aria-busy")).toBe("true");
    expect(wrapper.text()).toContain("Saving…");
    await wrapper.trigger("click");
    expect(wrapper.emitted("click")).toBeUndefined();
  });

  it("renders link-like targets without a disabled attribute", () => {
    const wrapper = mount(AppButton, {
      attrs: { href: "/settings" },
      props: { as: "a", disabled: true },
      slots: { default: "Settings" },
    });

    expect(wrapper.element.tagName).toBe("A");
    expect(wrapper.attributes("href")).toBe("/settings");
    expect(wrapper.attributes("disabled")).toBeUndefined();
    expect(wrapper.attributes("aria-disabled")).toBe("true");
  });
});

describe("form controls", () => {
  it("updates an input model and toggles password visibility", async () => {
    const wrapper = mount(AppInput, { props: { modelValue: "secret", type: "password" } });
    const input = wrapper.get("input");

    expect(input.attributes("type")).toBe("password");
    await wrapper.get("button").trigger("click");
    expect(input.attributes("type")).toBe("text");
    await input.setValue("new secret");
    expect(wrapper.emitted("update:modelValue")?.at(-1)).toEqual(["new secret"]);
  });

  it("preserves typed option values in selects", async () => {
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
    expect(describedBy.every((id) => Boolean(wrapper.find(`#${id}`).exists()))).toBe(true);
  });
});

describe("display primitives", () => {
  it("renders semantic panels, empty states, alerts, and the shared logo", () => {
    const panel = mount(PanelCard, { props: { as: "article" }, slots: { default: "Body" } });
    const empty = mount(EmptyState, {
      props: { title: "Nothing here", description: "Add a course.", headingLevel: 1 },
      slots: { actions: "Action", icon: "⌁" },
    });
    const alert = mount(AlertMessage, { slots: { default: "Failed" } });
    const logo = mount(AppLogo);

    expect(panel.element.tagName).toBe("ARTICLE");
    expect(empty.get("h1").text()).toBe("Nothing here");
    expect(empty.text()).toContain("Add a course.");
    expect(alert.attributes("role")).toBe("alert");
    expect(logo.text()).toContain("Course");
  });
});

describe("AppModal", () => {
  it("opens, labels itself, emits close, and restores focus", async () => {
    const trigger = document.createElement("button");
    document.body.append(trigger);
    trigger.focus();
    const wrapper = mount(AppModal, {
      attachTo: document.body,
      props: { open: false, title: "Confirm reset" },
      slots: { default: "Modal body", footer: "Modal actions" },
    });

    await wrapper.setProps({ open: true });
    await nextTick();
    const dialog = document.body.querySelector("dialog");
    expect(dialog?.hasAttribute("open")).toBe(true);
    expect(dialog?.getAttribute("aria-labelledby")).toBeTruthy();
    expect(document.body.textContent).toContain("Modal actions");

    const closeButton = dialog?.querySelector<HTMLButtonElement>(
      'button[aria-label="Close dialog"]',
    );
    closeButton?.click();
    expect(wrapper.emitted("close")).toHaveLength(1);

    await wrapper.setProps({ open: false });
    expect(document.activeElement).toBe(trigger);
    wrapper.unmount();
  });
});
