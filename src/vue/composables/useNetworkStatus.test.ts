// @vitest-environment happy-dom

import { mount } from "@vue/test-utils";
import { defineComponent, type Ref } from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useNetworkStatus } from "./useNetworkStatus.js";

describe("useNetworkStatus", () => {
  afterEach(() => vi.restoreAllMocks());

  it("tracks browser connectivity and removes its listeners on unmount", async () => {
    let connected = true;
    let online: Readonly<Ref<boolean>> | undefined;
    vi.spyOn(navigator, "onLine", "get").mockImplementation(() => connected);
    const wrapper = mount(
      defineComponent({
        template: "<div />",
        setup() {
          ({ online } = useNetworkStatus());
        },
      }),
    );

    expect(online?.value).toBe(true);
    connected = false;
    window.dispatchEvent(new Event("offline"));
    expect(online?.value).toBe(false);

    wrapper.unmount();
    connected = true;
    window.dispatchEvent(new Event("online"));
    expect(online?.value).toBe(false);
  });
});
