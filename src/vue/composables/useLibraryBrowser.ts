import { useQuery } from "@tanstack/vue-query";
import { computed, onScopeDispose, shallowRef, watch } from "vue";
import { useRoute, useRouter, type LocationQueryRaw } from "vue-router";

import { api, apiErrorMessage, type LibraryDto, type LibraryFilters } from "@/api.js";
import { libraryQueryOptions } from "@/queries.js";

function strings(value: unknown): string[] {
  const values = typeof value === "string" ? [value] : Array.isArray(value) ? value : [];
  return [...new Set(values.filter((item): item is string => typeof item === "string" && !!item))];
}

function emptyLibrary(): LibraryDto {
  return {
    videos: [],
    playlists: [],
    authors: [],
    tags: [],
    continueWatching: [],
    pagination: { page: 1, pageSize: 24, totalVideos: 0, totalPages: 0 },
  };
}

export function useLibraryBrowser(debounceMilliseconds = 150) {
  const route = useRoute();
  const router = useRouter();
  const routeSearch = computed(() => (typeof route.query.q === "string" ? route.query.q : ""));
  const query = shallowRef(routeSearch.value);
  const page = computed(() => Math.max(1, Number(route.query.page) || 1));

  function nextQuery(changes: LocationQueryRaw): LocationQueryRaw {
    const next = { ...route.query, ...changes };
    for (const [key, value] of Object.entries(next)) {
      if (value === undefined || value === null || value === "") delete next[key];
    }
    return next;
  }

  function selectedFilter(name: "author" | "tag") {
    return computed({
      get: () => strings(route.query[name]),
      set: (values: string[]) => {
        void router.push({
          query: nextQuery({ [name]: values.length ? values : undefined, page: undefined }),
        });
      },
    });
  }

  const selectedAuthor = selectedFilter("author");
  const selectedTag = selectedFilter("tag");
  const selectedView = computed({
    get: () => (route.query.view === "playlists" ? "playlists" : "videos"),
    set: (view: string) => {
      void router.push({
        query: nextQuery({ view: view === "playlists" ? "playlists" : undefined, page: undefined }),
      });
    },
  });
  const filters = computed<LibraryFilters>(() => ({
    query: routeSearch.value || undefined,
    author: selectedAuthor.value.length ? selectedAuthor.value : undefined,
    tag: selectedTag.value.length ? selectedTag.value : undefined,
    page: page.value,
  }));
  const request = useQuery(computed(() => libraryQueryOptions(filters.value, api)));
  const library = computed(() => request.data.value ?? emptyLibrary());
  const hasActiveFilters = computed(() =>
    Boolean(
      query.value ||
      selectedView.value === "playlists" ||
      selectedAuthor.value.length ||
      selectedTag.value.length,
    ),
  );

  let searchTimer: ReturnType<typeof setTimeout> | undefined;
  let ignoreNextSearchUpdate = false;
  watch(query, (value) => {
    clearTimeout(searchTimer);
    if (ignoreNextSearchUpdate) {
      ignoreNextSearchUpdate = false;
      return;
    }
    if (value === routeSearch.value) return;
    const update = () =>
      void router.replace({ query: nextQuery({ q: value.trim() || undefined, page: undefined }) });
    if (!value) update();
    else searchTimer = setTimeout(update, debounceMilliseconds);
  });
  watch(routeSearch, (value) => {
    if (query.value !== value) query.value = value;
  });
  watch(
    () => request.data.value?.pagination.page,
    (loadedPage) => {
      if (!loadedPage || loadedPage === page.value) return;
      void router.replace({
        query: nextQuery({ page: loadedPage === 1 ? undefined : String(loadedPage) }),
      });
    },
  );
  onScopeDispose(() => clearTimeout(searchTimer));

  return {
    clearFilters() {
      clearTimeout(searchTimer);
      if (query.value) {
        ignoreNextSearchUpdate = true;
        query.value = "";
      }
      void router.push({
        query: nextQuery({
          author: undefined,
          page: undefined,
          q: undefined,
          tag: undefined,
          view: undefined,
        }),
      });
    },
    error: computed(() => {
      const caught = request.error.value;
      return caught ? apiErrorMessage(caught, "Could not load your videos") : "";
    }),
    filters,
    hasActiveFilters,
    library,
    loading: computed(() => request.isPending.value),
    page,
    query,
    refreshing: computed(() => request.isFetching.value && !request.isPending.value),
    selectedAuthor,
    selectedView,
    selectedTag,
    setPage(nextPage: number) {
      return router.push({
        query: nextQuery({ page: nextPage <= 1 ? undefined : String(nextPage) }),
      });
    },
  };
}
