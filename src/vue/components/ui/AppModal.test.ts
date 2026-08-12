// @vitest-environment happy-dom

import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import { afterEach, describe, expect, it } from "vitest";

import AppModal from "./AppModal.vue";

afterEach(() => {
  document.body.innerHTML = "";
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

    dialog?.querySelector<HTMLButtonElement>('button[aria-label="Close dialog"]')?.click();
    expect(wrapper.emitted("close")).toHaveLength(1);

    await wrapper.setProps({ open: false });
    expect(document.activeElement).toBe(trigger);
    wrapper.unmount();
  });
});
