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
  it("requires 15 characters when signing in", () => {
    const wrapper = mount(AuthGate, {
      props: { ...baseProps, passwordConfigured: true },
    });
    const password = wrapper.get('input[autocomplete="current-password"]');

    expect(password.attributes("minlength")).toBe("15");
  });

  it("requires 15 characters when creating a password", () => {
    const wrapper = mount(AuthGate, {
      props: { ...baseProps, passwordConfigured: false },
    });

    expect(wrapper.get('input[autocomplete="new-password"]').attributes("minlength")).toBe("15");
  });
});
