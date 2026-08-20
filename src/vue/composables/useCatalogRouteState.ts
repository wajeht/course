import { computed, onScopeDispose, shallowRef, watch } from "vue";
import { useRoute, useRouter, type LocationQueryRaw } from "vue-router";

import type { CatalogFilters } from "@/api.js";

function queryString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function queryStrings(value: unknown): string[] {
  if (typeof value === "string") return value ? [value] : [];
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && Boolean(item));
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

  function selectFilters(name: "category" | "instructor" | "tag", values: string[]): void {
    const selected = [...new Set(values)].sort((left, right) => left.localeCompare(right));
    void router.push({
      query: routeQuery({ [name]: selected.length ? selected : undefined, page: undefined }),
    });
  }

  const selectedCategory = computed({
    get: () => queryStrings(route.query.category),
    set: (values: string[]) => selectFilters("category", values),
  });
  const selectedInstructor = computed({
    get: () => queryStrings(route.query.instructor),
    set: (values: string[]) => selectFilters("instructor", values),
  });
  const selectedTag = computed({
    get: () => queryStrings(route.query.tag),
    set: (values: string[]) => selectFilters("tag", values),
  });
  const selectedFilters = computed(() =>
    [...selectedCategory.value, ...selectedInstructor.value, ...selectedTag.value].filter(Boolean),
  );
  const hasActiveFilters = computed(() =>
    Boolean(query.value || selectedFilters.value.length),
  );
  const filters = computed<CatalogFilters>(() => ({
    query: searchQuery.value || undefined,
    category: selectedCategory.value.length ? selectedCategory.value : undefined,
    instructor: selectedInstructor.value.length ? selectedInstructor.value : undefined,
    tag: selectedTag.value.length ? selectedTag.value : undefined,
    page: page.value,
    pageSize: queryPageSize(route.query.pageSize),
  }));

  let searchTimer: ReturnType<typeof setTimeout> | undefined;
  watch(query, (value) => {
    clearTimeout(searchTimer);
    if (value === searchQuery.value) return;
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
