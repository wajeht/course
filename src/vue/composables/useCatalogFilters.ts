import { computed, onScopeDispose, ref, watch } from "vue";

import type { CatalogDto, CatalogFilters, ScanStatus } from "../api.js";

interface CatalogClient {
  getCatalog(filters?: CatalogFilters): Promise<CatalogDto>;
  getScanStatus(): Promise<ScanStatus>;
}

function emptyCatalog(): CatalogDto {
  return {
    courses: [],
    categories: [],
    instructors: [],
    tags: [],
    continueWatching: [],
  };
}

export function useCatalogFilters(client: CatalogClient, debounceMilliseconds = 120) {
  const catalog = ref<CatalogDto>(emptyCatalog());
  const catalogLoaded = ref(false);
  const scanStatus = ref<ScanStatus | null>(null);
  const query = ref("");
  const selectedCategory = ref("");
  const selectedInstructor = ref("");
  const selectedTag = ref("");
  const loading = ref(true);
  const error = ref("");
  let searchTimer: ReturnType<typeof setTimeout> | undefined;
  let requestSequence = 0;

  const selectedFilters = computed(() =>
    [selectedCategory.value, selectedInstructor.value, selectedTag.value].filter(Boolean),
  );
  const hasActiveFilters = computed(() => Boolean(query.value || selectedFilters.value.length));
  const refreshing = computed(() => loading.value && catalogLoaded.value);
  const libraryTitle = computed(() => {
    const count = catalog.value.courses.length;
    const courseLabel = count === 1 ? "course" : "courses";
    if (query.value) return `${count} matching ${courseLabel}`;
    if (selectedFilters.value.length === 1) return `${selectedFilters.value[0]} courses`;
    if (selectedFilters.value.length > 1) return `${count} filtered ${courseLabel}`;
    return "All courses";
  });

  function filters(): CatalogFilters {
    return {
      query: query.value || undefined,
      category: selectedCategory.value || undefined,
      instructor: selectedInstructor.value || undefined,
      tag: selectedTag.value || undefined,
    };
  }

  async function loadCatalog(): Promise<void> {
    const requestId = ++requestSequence;
    loading.value = true;
    error.value = "";
    try {
      const loadedCatalog = await client.getCatalog(filters());
      if (requestId === requestSequence) catalog.value = loadedCatalog;
    } catch (caught) {
      if (requestId !== requestSequence) return;
      error.value = caught instanceof Error ? caught.message : "Could not load your library";
    } finally {
      if (requestId === requestSequence) {
        loading.value = false;
        catalogLoaded.value = true;
      }
    }
  }

  async function loadScanStatus(): Promise<void> {
    try {
      scanStatus.value = await client.getScanStatus();
    } catch (caught) {
      error.value = caught instanceof Error ? caught.message : "Could not load the scan status";
    }
  }

  async function initializeCatalog(): Promise<void> {
    await Promise.all([loadCatalog(), loadScanStatus()]);
  }

  const stopQueryWatch = watch(query, (value) => {
    clearTimeout(searchTimer);
    if (!value) {
      void loadCatalog();
      return;
    }
    searchTimer = setTimeout(() => void loadCatalog(), debounceMilliseconds);
  });
  const stopSelectWatch = watch([selectedCategory, selectedInstructor, selectedTag], () => {
    clearTimeout(searchTimer);
    void loadCatalog();
  });

  onScopeDispose(() => {
    clearTimeout(searchTimer);
    requestSequence++;
    stopQueryWatch();
    stopSelectWatch();
  });

  return {
    catalog,
    catalogLoaded,
    error,
    hasActiveFilters,
    initializeCatalog,
    libraryTitle,
    loading,
    query,
    refreshing,
    scanStatus,
    selectedCategory,
    selectedFilters,
    selectedInstructor,
    selectedTag,
  };
}
