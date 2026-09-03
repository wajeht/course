import { useQuery, useQueryClient } from "@tanstack/vue-query";
import {
  computed,
  onScopeDispose,
  readonly,
  shallowRef,
  toRef,
  watch,
  type MaybeRefOrGetter,
} from "vue";
import { useRoute, useRouter, type LocationQueryRaw, type LocationQueryValue } from "vue-router";

import {
  api,
  apiErrorMessage,
  type LibraryDto,
  type LibraryFilters,
  type LibraryPageSize,
} from "@/api.js";
import { useDestinationPrefetch } from "@/composables/useDestinationPrefetch.js";
import { libraryQueryOptions } from "@/queries.js";

function strings(value: LocationQueryValue | LocationQueryValue[] | undefined): string[] {
  if (value === undefined) return [];
  const values = Array.isArray(value) ? value : [value];
  return [...new Set(values.filter((item): item is string => item !== null && item.length > 0))];
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

interface UseLibraryBrowserOptions {
  accumulatePages?: MaybeRefOrGetter<boolean>;
  debounceMilliseconds?: number;
  pageSize?: MaybeRefOrGetter<LibraryPageSize | undefined>;
}

export function useLibraryBrowser(options: UseLibraryBrowserOptions = {}) {
  const { accumulatePages = false, debounceMilliseconds = 150, pageSize } = options;
  const route = useRoute();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { prefetchLibrary } = useDestinationPrefetch();
  const accumulatePagesRef = toRef(accumulatePages);
  const pageSizeRef = toRef(pageSize);
  const routeSearch = computed(() => {
    const value = route.query.q;
    return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
  });
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
          query: nextQuery({ [name]: values.length ? values : undefined }),
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
        query: nextQuery({ view: view === "playlists" ? "playlists" : undefined }),
      });
    },
  });
  const filters = computed<LibraryFilters>(() => ({
    query: routeSearch.value || undefined,
    author: selectedAuthor.value.length ? selectedAuthor.value : undefined,
    tag: selectedTag.value.length ? selectedTag.value : undefined,
    page: page.value,
    pageSize: pageSizeRef.value,
    view: selectedView.value === "playlists" ? "playlists" : undefined,
  }));
  const request = useQuery(computed(() => libraryQueryOptions(filters.value, api)));
  const library = computed(() => request.data.value ?? emptyLibrary());
  const loadedVideos = shallowRef<LibraryDto["videos"]>([]);
  const loadedPage = shallowRef(1);
  const loadedTotalPages = shallowRef(0);
  const loadingMore = shallowRef(false);
  const loadMoreError = shallowRef("");
  const accumulationRetry = shallowRef(0);
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
  watch(
    [filters, library, accumulatePagesRef, accumulationRetry],
    async ([activeFilters, loadedLibrary, shouldAccumulate], _previous, onCleanup) => {
      let cancelled = false;
      onCleanup(() => {
        cancelled = true;
      });

      const requestedPage = activeFilters.page ?? 1;
      if (loadedLibrary.pagination.page !== requestedPage) return;

      loadedTotalPages.value = loadedLibrary.pagination.totalPages;
      loadMoreError.value = "";

      if (!shouldAccumulate) {
        loadedVideos.value = loadedLibrary.videos;
        loadedPage.value = loadedLibrary.pagination.page;
        loadingMore.value = false;
        return;
      }

      try {
        const libraries = await Promise.all(
          Array.from({ length: requestedPage }, (_, index) =>
            queryClient.fetchQuery(libraryQueryOptions({ ...activeFilters, page: index + 1 }, api)),
          ),
        );
        if (cancelled) return;

        const loadedIds = new Set<string>();
        loadedVideos.value = libraries.flatMap((pageLibrary) =>
          pageLibrary.videos.filter((video) => {
            if (loadedIds.has(video.id)) return false;
            loadedIds.add(video.id);
            return true;
          }),
        );
        loadedPage.value = loadedLibrary.pagination.page;
      } catch (caught) {
        if (cancelled) return;
        loadMoreError.value = apiErrorMessage(caught, "Could not load more videos");
      } finally {
        if (!cancelled) loadingMore.value = false;
      }
    },
    { immediate: true },
  );
  onScopeDispose(() => clearTimeout(searchTimer));

  const canLoadMore = computed(() => loadedPage.value < loadedTotalPages.value);

  function setPage(nextPage: number) {
    return router.push({
      query: nextQuery({ page: nextPage <= 1 ? undefined : String(nextPage) }),
    });
  }

  function prefetchPage(nextPage: number): void {
    prefetchDestination({ ...filters.value, page: Math.max(1, nextPage) }, selectedView.value);
  }

  function prefetchFilter(name: "author" | "tag", selection: string[]): void {
    prefetchDestination(
      {
        ...filters.value,
        [name]: selection.length ? selection : undefined,
      },
      selectedView.value,
    );
  }

  function prefetchPageSize(nextPageSize: LibraryPageSize): void {
    prefetchDestination({ ...filters.value, pageSize: nextPageSize }, selectedView.value);
  }

  function prefetchView(view: "videos" | "playlists"): void {
    prefetchDestination(
      { ...filters.value, view: view === "playlists" ? "playlists" : undefined },
      view,
    );
  }

  function prefetchDestination(nextFilters: LibraryFilters, view: "videos" | "playlists"): void {
    void prefetchLibrary(nextFilters, view).catch(() => undefined);
  }

  async function loadMore(): Promise<void> {
    if (loadingMore.value || !canLoadMore.value) return;

    const currentPage = page.value;
    const nextPage = currentPage > loadedPage.value ? currentPage : loadedPage.value + 1;
    loadingMore.value = true;
    loadMoreError.value = "";

    try {
      if (nextPage !== currentPage) await setPage(nextPage);
      await queryClient.fetchQuery(libraryQueryOptions({ ...filters.value, page: nextPage }, api));
      if (nextPage === currentPage) accumulationRetry.value += 1;
    } catch (caught) {
      loadMoreError.value = apiErrorMessage(caught, "Could not load more videos");
      loadingMore.value = false;
    }
  }

  return {
    canLoadMore,
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
    loadedVideos: readonly(loadedVideos),
    loadMore,
    loadMoreError: readonly(loadMoreError),
    loadingMore: readonly(loadingMore),
    page,
    prefetchFilter,
    prefetchPage,
    prefetchPageSize,
    prefetchView,
    query,
    refreshing: computed(() => request.isFetching.value && !request.isPending.value),
    selectedAuthor,
    selectedView,
    selectedTag,
    setPage,
  };
}
