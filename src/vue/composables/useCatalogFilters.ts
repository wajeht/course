import { keepPreviousData, useQuery } from "@tanstack/vue-query";
import { computed, onScopeDispose, ref, watch } from "vue";
import { useRoute, useRouter, type LocationQueryRaw } from "vue-router";

import type { CatalogDto, CatalogFilters, ScanStatus } from "../api.js";
import { catalogKeys, scanKeys } from "../queries/queryKeys.js";

interface CatalogClient {
  getCatalog(filters?: CatalogFilters, signal?: AbortSignal): Promise<CatalogDto>;
  getScanStatus(): Promise<ScanStatus>;
}

function queryString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function queryPage(value: unknown): number {
  const page = Number.parseInt(queryString(value), 10);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

function emptyCatalog(): CatalogDto {
  return {
    courses: [],
    categories: [],
    instructors: [],
    tags: [],
    continueWatching: [],
    pagination: { page: 1, pageSize: 24, totalCourses: 0, totalPages: 0 },
  };
}

export function useCatalogFilters(client: CatalogClient, debounceMilliseconds = 150) {
  const route = useRoute();
  const router = useRouter();
  const searchQuery = computed(() => queryString(route.query.q));
  const query = ref(searchQuery.value);
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

  const filters = computed<CatalogFilters>(() => ({
    query: searchQuery.value || undefined,
    category: selectedCategory.value || undefined,
    instructor: selectedInstructor.value || undefined,
    tag: selectedTag.value || undefined,
    page: page.value,
    pageSize: 24,
  }));

  const catalogQuery = useQuery({
    queryKey: computed(() => catalogKeys.list(filters.value)),
    queryFn: ({ queryKey, signal }) => client.getCatalog(queryKey[2], signal),
    placeholderData: keepPreviousData,
  });
  const scanStatusQuery = useQuery({
    queryKey: scanKeys.all,
    queryFn: () => client.getScanStatus(),
  });

  const catalog = computed(() => catalogQuery.data.value ?? emptyCatalog());
  const scanStatus = computed(() => scanStatusQuery.data.value ?? null);
  const loading = computed(() => catalogQuery.isPending.value);
  const refreshing = computed(() => catalogQuery.isFetching.value && !catalogQuery.isPending.value);
  const error = computed(() => {
    const caught = catalogQuery.error.value ?? scanStatusQuery.error.value;
    return caught instanceof Error ? caught.message : caught ? "Could not load your library" : "";
  });
  const selectedFilters = computed(() =>
    [selectedCategory.value, selectedInstructor.value, selectedTag.value].filter(Boolean),
  );
  const hasActiveFilters = computed(() =>
    Boolean(searchQuery.value || selectedFilters.value.length),
  );
  const libraryTitle = computed(() => {
    const count = catalog.value.pagination.totalCourses;
    const courseLabel = count === 1 ? "course" : "courses";
    if (searchQuery.value) return `${count} matching ${courseLabel}`;
    if (selectedFilters.value.length === 1) return `${selectedFilters.value[0]} courses`;
    if (selectedFilters.value.length > 1) return `${count} filtered ${courseLabel}`;
    return "All courses";
  });

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
  watch(
    () => catalogQuery.dataUpdatedAt.value,
    () => {
      const loadedPage = catalog.value.pagination.page;
      if (catalogQuery.isPlaceholderData.value || loadedPage === page.value) return;
      void router.replace({
        query: routeQuery({ page: loadedPage === 1 ? undefined : String(loadedPage) }),
      });
    },
  );

  function setPage(nextPage: number): void {
    const normalized = Math.max(1, Math.min(nextPage, catalog.value.pagination.totalPages || 1));
    void router.push({
      query: routeQuery({ page: normalized === 1 ? undefined : String(normalized) }),
    });
  }

  onScopeDispose(() => clearTimeout(searchTimer));

  return {
    catalog,
    error,
    hasActiveFilters,
    libraryTitle,
    loading,
    page,
    query,
    refreshing,
    scanStatus,
    selectedCategory,
    selectedFilters,
    selectedInstructor,
    selectedTag,
    setPage,
  };
}
