// @vitest-environment happy-dom

import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import { afterEach, describe, expect, it, vi } from "vitest";

import { api, type CatalogDto } from "@/api.js";
import { queryKeys } from "@/queries.js";
import InstructorPage from "./InstructorPage.vue";

function catalog(title: string): CatalogDto {
  return {
    playlists: [
      {
        id: title,
        title,
        description: "",
        coverUrl: null,
        category: "",
        authors: ["Author"],
        tags: [],
        lessonCount: 1,
        durationSeconds: 60,
        completedCount: 0,
        progressPercent: 0,
      },
    ],
    categories: [],
    authors: [],
    tags: [],
    continueWatching: [],
    pagination: { page: 1, pageSize: 24, totalCourses: 1, totalPages: 1 },
  };
}

describe("InstructorPage", () => {
  afterEach(() => vi.restoreAllMocks());

  it("renders prefetched author data on initial mount", async () => {
    const request = vi.spyOn(api, "getCatalog");
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/library", component: { template: "<div />" } },
        { path: "/playlists/:courseId", name: "playlist", component: { template: "<div />" } },
        { path: "/authors/:instructorName", name: "author", component: InstructorPage },
      ],
    });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    queryClient.setQueryData(
      queryKeys.catalogList({ author: ["Alpha"], page: 1 }),
      catalog("Cached playlist"),
    );
    await router.push("/authors/Alpha");
    const wrapper = mount(InstructorPage, {
      global: { plugins: [[VueQueryPlugin, { queryClient }], router] },
    });

    expect(wrapper.text()).toContain("Cached playlist");
    expect(wrapper.find('[aria-label="Loading author playlists"]').exists()).toBe(false);
    expect(request).not.toHaveBeenCalled();
    wrapper.unmount();
    queryClient.clear();
  });

  it("shows a request error instead of loading forever", async () => {
    vi.spyOn(api, "getCatalog").mockRejectedValueOnce(new TypeError("Failed to fetch"));
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/library", component: { template: "<div />" } },
        { path: "/playlists/:courseId", name: "playlist", component: { template: "<div />" } },
        { path: "/authors/:instructorName", name: "author", component: InstructorPage },
      ],
    });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    await router.push("/authors/Alpha");
    const wrapper = mount(InstructorPage, {
      global: { plugins: [[VueQueryPlugin, { queryClient }], router] },
    });

    await vi.waitFor(() => expect(wrapper.text()).toContain("Could not load this author"));
    expect(wrapper.text()).not.toContain("Failed to fetch");
    expect(wrapper.find('[aria-label="Loading author playlists"]').exists()).toBe(false);
    wrapper.unmount();
    queryClient.clear();
  });

  it("hides the previous author while a new route param loads", async () => {
    let resolveNext: ((value: CatalogDto) => void) | undefined;
    vi.spyOn(api, "getCatalog")
      .mockResolvedValueOnce(catalog("Alpha playlist"))
      .mockReturnValueOnce(
        new Promise<CatalogDto>((resolve) => {
          resolveNext = resolve;
        }),
      );
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/library", component: { template: "<div />" } },
        { path: "/playlists/:courseId", name: "playlist", component: { template: "<div />" } },
        { path: "/authors/:instructorName", name: "author", component: InstructorPage },
      ],
    });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    await router.push("/authors/Alpha");
    const wrapper = mount(InstructorPage, {
      global: { plugins: [[VueQueryPlugin, { queryClient }], router] },
    });

    await vi.waitFor(() => expect(wrapper.text()).toContain("Alpha playlist"));
    await router.push("/authors/Bravo");
    await vi.waitFor(() => expect(api.getCatalog).toHaveBeenCalledTimes(2));

    expect(wrapper.text()).not.toContain("Alpha playlist");
    const loadingStatus = wrapper.get('[aria-label="Loading author playlists"]');
    expect(loadingStatus.attributes("role")).toBe("status");

    resolveNext?.(catalog("Bravo playlist"));
    await vi.waitFor(() => expect(wrapper.text()).toContain("Bravo playlist"));
    wrapper.unmount();
    queryClient.clear();
  });
});
