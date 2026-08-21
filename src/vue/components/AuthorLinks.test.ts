// @vitest-environment happy-dom

import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import { describe, expect, it } from "vitest";

import AuthorLinks from "./AuthorLinks.vue";

describe("AuthorLinks", () => {
  it("links each credited author to their author page", async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/authors/:authorName", name: "author", component: { template: "<div />" } },
      ],
    });
    await router.push("/");
    await router.isReady();
    const queryClient = new QueryClient();

    const wrapper = mount(AuthorLinks, {
      props: { authors: ["Jane Smith", "Guest"] },
      global: { plugins: [[VueQueryPlugin, { queryClient }], router] },
    });

    expect(wrapper.text()).toBe("Jane Smith, Guest");
    expect(wrapper.get('a[href="/authors/Jane%20Smith"]').text()).toBe("Jane Smith");
    expect(wrapper.get('a[href="/authors/Guest"]').text()).toBe("Guest");
  });
});
