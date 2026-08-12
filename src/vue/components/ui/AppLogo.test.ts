// @vitest-environment happy-dom

import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import AppLogo from "./AppLogo.vue";

describe("AppLogo", () => {
  it("renders the Course brand", () => {
    expect(mount(AppLogo).text()).toContain("Course");
  });
});
