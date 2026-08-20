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
    courses: [
      {
        id: title,
        title,
        description: "",
        coverUrl: null,
        category: "",
        instructors: ["Instructor"],
        tags: [],
        lessonCount: 1,
        durationSeconds: 60,
        completedCount: 0,
        progressPercent: 0,
      },
    ],
    categories: [],
    instructors: [],
    tags: [],
    continueWatching: [],
    pagination: { page: 1, pageSize: 24, totalCourses: 1, totalPages: 1 },
  };
}

describe("InstructorPage", () => {
  afterEach(() => vi.restoreAllMocks());

  it("renders prefetched instructor data on initial mount", async () => {
    const request = vi.spyOn(api, "getCatalog");
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/library", component: { template: "<div />" } },
        { path: "/courses/:courseId", name: "course", component: { template: "<div />" } },
        { path: "/instructors/:instructorName", name: "instructor", component: InstructorPage },
      ],
    });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    queryClient.setQueryData(
      queryKeys.catalogList({ instructor: ["Alpha"], page: 1 }),
      catalog("Cached course"),
    );
    await router.push("/instructors/Alpha");
    const wrapper = mount(InstructorPage, {
      global: { plugins: [[VueQueryPlugin, { queryClient }], router] },
    });

    expect(wrapper.text()).toContain("Cached course");
    expect(wrapper.find('[aria-label="Loading"]').exists()).toBe(false);
    expect(request).not.toHaveBeenCalled();
    wrapper.unmount();
    queryClient.clear();
  });

  it("shows a request error instead of loading forever", async () => {
    vi.spyOn(api, "getCatalog").mockRejectedValueOnce(new Error("Could not load instructor"));
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/library", component: { template: "<div />" } },
        { path: "/courses/:courseId", name: "course", component: { template: "<div />" } },
        { path: "/instructors/:instructorName", name: "instructor", component: InstructorPage },
      ],
    });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    await router.push("/instructors/Alpha");
    const wrapper = mount(InstructorPage, {
      global: { plugins: [[VueQueryPlugin, { queryClient }], router] },
    });

    await vi.waitFor(() => expect(wrapper.text()).toContain("Could not load instructor"));
    expect(wrapper.find('[aria-label="Loading"]').exists()).toBe(false);
    wrapper.unmount();
    queryClient.clear();
  });

  it("hides the previous instructor while a new route param loads", async () => {
    let resolveNext: ((value: CatalogDto) => void) | undefined;
    vi.spyOn(api, "getCatalog")
      .mockResolvedValueOnce(catalog("Alpha course"))
      .mockReturnValueOnce(
        new Promise<CatalogDto>((resolve) => {
          resolveNext = resolve;
        }),
      );
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/library", component: { template: "<div />" } },
        { path: "/courses/:courseId", name: "course", component: { template: "<div />" } },
        { path: "/instructors/:instructorName", name: "instructor", component: InstructorPage },
      ],
    });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    await router.push("/instructors/Alpha");
    const wrapper = mount(InstructorPage, {
      global: { plugins: [[VueQueryPlugin, { queryClient }], router] },
    });

    await vi.waitFor(() => expect(wrapper.text()).toContain("Alpha course"));
    await router.push("/instructors/Bravo");
    await vi.waitFor(() => expect(api.getCatalog).toHaveBeenCalledTimes(2));

    expect(wrapper.text()).not.toContain("Alpha course");
    expect(wrapper.find('[aria-label="Loading"]').exists()).toBe(true);

    resolveNext?.(catalog("Bravo course"));
    await vi.waitFor(() => expect(wrapper.text()).toContain("Bravo course"));
    wrapper.unmount();
    queryClient.clear();
  });
});
