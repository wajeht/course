// @vitest-environment happy-dom

import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import AuthPage from "./AuthPage.vue";

const baseProps = {
  busy: false,
  message: undefined,
  setupEnabled: true,
  setupTokenRequired: false,
  status: "unauthenticated" as const,
};

describe("AuthPage", () => {
  it("does not show password setup guidance when signing in", () => {
    const wrapper = mount(AuthPage, {
      props: { ...baseProps, passwordConfigured: true },
    });
    const password = wrapper.get('input[autocomplete="current-password"]');

    expect(password.attributes("minlength")).toBeUndefined();
    expect(wrapper.text()).toContain("Please sign in to continue.");
    expect(wrapper.text()).not.toContain("Use at least 15 characters.");
  });

  it("shows the project link and current app version", () => {
    const wrapper = mount(AuthPage, {
      props: { ...baseProps, passwordConfigured: true },
    });
    const githubLink = wrapper.get('a[href="https://github.com/wajeht"]');

    expect(githubLink.text()).toBe("@wajeht");
    expect(githubLink.attributes("rel")).toBe("noreferrer");
    expect(wrapper.text()).toContain("© 2026 · Made with ❤️ by @wajeht . v0.1.0");
  });

  it("requires 15 characters when creating a password", () => {
    const wrapper = mount(AuthPage, {
      props: { ...baseProps, passwordConfigured: false },
    });

    expect(wrapper.get('input[autocomplete="new-password"]').attributes("minlength")).toBe("15");
    expect(wrapper.text()).toContain("Use at least 15 characters.");
    expect(wrapper.text()).toContain("Set up your library");
  });

  it("explains the setup token", () => {
    const wrapper = mount(AuthPage, {
      props: { ...baseProps, passwordConfigured: false, setupTokenRequired: true },
    });

    expect(wrapper.text()).toContain("Enter the one-time setup token configured on your server.");
  });

  it("uses the shared control height throughout the setup form", () => {
    const wrapper = mount(AuthPage, {
      props: { ...baseProps, passwordConfigured: false, setupTokenRequired: true },
    });
    const inputs = wrapper.findAll('input[type="password"]');
    const submit = wrapper.get('button[type="submit"]');

    expect(inputs).toHaveLength(3);
    expect(inputs.every((input) => input.classes().includes("min-h-10"))).toBe(true);
    expect(inputs.every((input) => !input.classes().includes("lg:min-h-12"))).toBe(true);
    expect(submit.classes()).toContain("h-10");
    expect(submit.classes()).not.toContain("lg:h-12");
  });
});
