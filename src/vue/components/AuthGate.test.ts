// @vitest-environment happy-dom

import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import AuthGate from "./AuthGate.vue";

const baseProps = {
  busy: false,
  message: undefined,
  setupEnabled: true,
  setupTokenRequired: false,
  status: "unauthenticated" as const,
};

describe("AuthGate", () => {
  it("does not show password setup guidance when signing in", () => {
    const wrapper = mount(AuthGate, {
      props: { ...baseProps, passwordConfigured: true },
    });
    const password = wrapper.get('input[autocomplete="current-password"]');

    expect(password.attributes("minlength")).toBeUndefined();
    expect(wrapper.text()).toContain("Please sign in to continue.");
    expect(wrapper.text()).not.toContain("Use at least 15 characters.");
  });

  it("requires 15 characters when creating a password", () => {
    const wrapper = mount(AuthGate, {
      props: { ...baseProps, passwordConfigured: false },
    });

    expect(wrapper.get('input[autocomplete="new-password"]').attributes("minlength")).toBe("15");
    expect(wrapper.text()).toContain("Use at least 15 characters.");
    expect(wrapper.text()).toContain("Set up your library");
  });

  it("explains the setup token", () => {
    const wrapper = mount(AuthGate, {
      props: { ...baseProps, passwordConfigured: false, setupTokenRequired: true },
    });

    expect(wrapper.text()).toContain("Enter the one-time setup token configured on your server.");
  });
});
