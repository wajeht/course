import { useQuery, useQueryClient } from "@tanstack/vue-query";
import { computed, readonly, shallowRef, toRef, watch, type MaybeRefOrGetter } from "vue";
import { useRoute, useRouter } from "vue-router";

import { api, apiErrorMessage, type LibraryDto } from "@/api.js";
import { libraryQueryOptions } from "@/queries.js";
import { notFoundLocation } from "@/router.js";
import { setPageTitle } from "@/utils.js";

export function useAuthorLibrary(accumulatePages: MaybeRefOrGetter<boolean>) {
  const route = useRoute();
  const router = useRouter();
  const queryClient = useQueryClient();
  const accumulatePagesRef = toRef(accumulatePages);
  const authorName = computed(() => String(route.params.authorName));
  const page = computed(() => {
    const value = typeof route.query.page === "string" ? Number.parseInt(route.query.page, 10) : 1;
    return Number.isInteger(value) && value > 0 ? value : 1;
  });
  const filters = computed(() => ({ author: [authorName.value], page: page.value }));
  const request = useQuery(computed(() => libraryQueryOptions(filters.value)));
  const library = computed(() =>
    request.isPlaceholderData.value ? undefined : request.data.value,
  );
  const author = computed(() =>
    library.value?.authors.find(
      ({ name }) =>
        name.localeCompare(authorName.value, undefined, { sensitivity: "accent" }) === 0,
    ),
  );
  const loadedVideos = shallowRef<LibraryDto["videos"]>([]);
  const loadedPlaylists = shallowRef<LibraryDto["playlists"]>([]);
  const loadedPage = shallowRef(1);
  const loadedTotalPages = shallowRef(0);
  const accumulating = shallowRef(false);
  const loadingMore = shallowRef(false);
  const loadMoreError = shallowRef("");
  const accumulationRetry = shallowRef(0);
  const loading = computed(
    () =>
      request.isPending.value ||
      (request.isPlaceholderData.value && !accumulatePagesRef.value) ||
      (accumulating.value && loadedVideos.value.length === 0),
  );
  const refreshing = computed(
    () => (request.isFetching.value || accumulating.value) && !loading.value,
  );
  const error = computed(() => {
    const caught = request.error.value;
    return caught ? apiErrorMessage(caught, "Could not load this author") : "";
  });

  function pageQuery(nextPage: number) {
    return nextPage === 1 ? {} : { page: String(nextPage) };
  }

  function setPage(nextPage: number) {
    return router.push({ query: pageQuery(Math.max(1, nextPage)) });
  }

  function prefetchPage(nextPage: number): void {
    void queryClient.prefetchQuery(
      libraryQueryOptions({ author: [authorName.value], page: Math.max(1, nextPage) }),
    );
  }

  async function loadMore(): Promise<void> {
    if (loadingMore.value || loadedPage.value >= loadedTotalPages.value) return;

    const requestedAuthor = authorName.value;
    const currentPage = page.value;
    const nextPage = currentPage > loadedPage.value ? currentPage : loadedPage.value + 1;
    loadingMore.value = true;
    loadMoreError.value = "";

    try {
      if (nextPage !== currentPage) await setPage(nextPage);
      await queryClient.fetchQuery(
        libraryQueryOptions({ author: [requestedAuthor], page: nextPage }),
      );
      if (authorName.value !== requestedAuthor) return;
      if (nextPage === currentPage) accumulationRetry.value += 1;
    } catch (caught) {
      if (authorName.value !== requestedAuthor) return;
      loadMoreError.value = apiErrorMessage(caught, "Could not load more videos");
      loadingMore.value = false;
    }
  }

  watch(authorName, () => {
    loadedVideos.value = [];
    loadedPlaylists.value = [];
    loadedPage.value = 1;
    loadedTotalPages.value = 0;
    accumulating.value = false;
    loadingMore.value = false;
    loadMoreError.value = "";
  });
  watch(
    [filters, library, accumulatePagesRef, accumulationRetry],
    async ([activeFilters, loadedLibrary, shouldAccumulate], _previous, onCleanup) => {
      if (!loadedLibrary) return;

      let cancelled = false;
      onCleanup(() => {
        cancelled = true;
      });

      const requestedPage = activeFilters.page;
      if (loadedLibrary.pagination.page !== requestedPage) return;

      loadedTotalPages.value = loadedLibrary.pagination.totalPages;
      loadMoreError.value = "";

      if (!shouldAccumulate) {
        accumulating.value = false;
        loadedVideos.value = loadedLibrary.videos;
        loadedPlaylists.value = loadedLibrary.playlists;
        loadedPage.value = loadedLibrary.pagination.page;
        loadingMore.value = false;
        return;
      }

      accumulating.value = true;
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
        loadedPlaylists.value = libraries[0]?.playlists ?? [];
        loadedPage.value = loadedLibrary.pagination.page;
      } catch (caught) {
        if (cancelled) return;
        loadMoreError.value = apiErrorMessage(caught, "Could not load more videos");
      } finally {
        if (!cancelled) {
          accumulating.value = false;
          loadingMore.value = false;
        }
      }
    },
    { immediate: true },
  );
  watch(
    [authorName, author],
    ([requestedName, loadedAuthor]) => setPageTitle(loadedAuthor?.name ?? requestedName),
    { immediate: true },
  );
  watch(
    [request.isSuccess, request.isPlaceholderData, library],
    ([success, placeholder, loadedLibrary]) => {
      if (!success || placeholder || !loadedLibrary) return;
      if (!author.value) {
        void router.replace(notFoundLocation(route.path));
        return;
      }
      if (loadedLibrary.pagination.page !== page.value) {
        void router.replace({ query: pageQuery(loadedLibrary.pagination.page) });
      }
    },
    { immediate: true },
  );

  return {
    author,
    authorName,
    canLoadMore: computed(() => loadedPage.value < loadedTotalPages.value),
    error,
    library,
    loadedPlaylists: readonly(loadedPlaylists),
    loadedVideos: readonly(loadedVideos),
    loading,
    loadingMore: readonly(loadingMore),
    loadMore,
    loadMoreError: readonly(loadMoreError),
    page,
    prefetchPage,
    refreshing,
    setPage,
  };
}
