import { computed, onScopeDispose, shallowRef, watch } from "vue";
import { useRoute, useRouter, type LocationQueryRaw } from "vue-router";

import type { CatalogFilters } from "@/api.js";

function queryString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function queryPage(value: unknown): number {
  const page = Number.parseInt(queryString(value), 10);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

function queryPageSize(value: unknown): number | undefined {
  const pageSize = Number.parseInt(queryString(value), 10);
  return Number.isInteger(pageSize) && pageSize >= 1 && pageSize <= 100 ? pageSize : undefined;
}

export function useCatalogRouteState(debounceMilliseconds = 150) {
  const route = useRoute();
  const router = useRouter();
  const searchQuery = computed(() => queryString(route.query.q));
  const query = shallowRef(searchQuery.value);
  const page = computed(() => queryPage(route.query.page));

  function routeQuery(changes: LocationQueryRaw): LocationQueryRaw {
    const next = { ...route.query, ...changes };
    for (const [key, value] of Object.entries(next)) {
      if (value === undefined || value === null || value === "") delete next[key];
    }
    return next;
  }

  function selectFilter(name: "category" | "instructor" | "tag", value: string): void {
    void router.push({ query: routeQuery({ [name]: value || undefined, page: undefined }) });
  }

  const selectedCategory = computed({
    get: () => queryString(route.query.category),
    set: (value: string) => selectFilter("category", value),
  });
  const selectedInstructor = computed({
    get: () => queryString(route.query.instructor),
    set: (value: string) => selectFilter("instructor", value),
  });
  const selectedTag = computed({
    get: () => queryString(route.query.tag),
    set: (value: string) => selectFilter("tag", value),
  });
  const selectedFilters = computed(() =>
    [selectedCategory.value, selectedInstructor.value, selectedTag.value].filter(Boolean),
  );
  const hasActiveFilters = computed(() =>
    Boolean(searchQuery.value || selectedFilters.value.length),
  );
  const filters = computed<CatalogFilters>(() => ({
    query: searchQuery.value || undefined,
    category: selectedCategory.value || undefined,
    instructor: selectedInstructor.value || undefined,
    tag: selectedTag.value || undefined,
    page: page.value,
    pageSize: queryPageSize(route.query.pageSize),
  }));

  let searchTimer: ReturnType<typeof setTimeout> | undefined;
  watch(query, (value) => {
    clearTimeout(searchTimer);
    const updateUrl = () =>
      void router.replace({
        query: routeQuery({ q: value.trim() || undefined, page: undefined }),
      });
    if (!value) updateUrl();
    else searchTimer = setTimeout(updateUrl, debounceMilliseconds);
  });
  watch(searchQuery, (value) => {
    if (query.value !== value) query.value = value;
  });

  function setPage(nextPage: number): void {
    const normalized = Math.max(1, nextPage);
    void router.push({
      query: routeQuery({ page: normalized === 1 ? undefined : String(normalized) }),
    });
  }

  function normalizePage(loadedPage: number): void {
    if (loadedPage === page.value) return;
    void router.replace({
      query: routeQuery({ page: loadedPage === 1 ? undefined : String(loadedPage) }),
    });
  }

  onScopeDispose(() => clearTimeout(searchTimer));

  return {
    filters,
    hasActiveFilters,
    normalizePage,
    page,
    query,
    searchQuery,
    selectedCategory,
    selectedFilters,
    selectedInstructor,
    selectedTag,
    setPage,
  };
}
