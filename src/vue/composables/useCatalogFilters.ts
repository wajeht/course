import { computed, onScopeDispose, ref, watch } from "vue";

import type { CatalogDto, CatalogFilters, ScanStatus } from "../api.js";

interface CatalogClient {
  getCatalog(filters?: CatalogFilters): Promise<CatalogDto>;
  getScanStatus(): Promise<ScanStatus>;
  rescanCatalog(): Promise<ScanStatus>;
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

export function useCatalogFilters(client: CatalogClient, debounceMilliseconds = 220) {
  const catalog = ref<CatalogDto>(emptyCatalog());
  const scanStatus = ref<ScanStatus | null>(null);
  const query = ref("");
  const selectedCategory = ref("");
  const selectedInstructor = ref("");
  const selectedTag = ref("");
  const loading = ref(true);
  const scanning = ref(false);
  const error = ref("");
  let searchTimer: ReturnType<typeof setTimeout> | undefined;
  let requestSequence = 0;

  const selectedFilters = computed(() =>
    [selectedCategory.value, selectedInstructor.value, selectedTag.value].filter(Boolean),
  );
  const hasActiveFilters = computed(() => Boolean(query.value || selectedFilters.value.length));
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
      if (requestId === requestSequence) loading.value = false;
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

  async function rescanCatalog(): Promise<void> {
    scanning.value = true;
    error.value = "";
    try {
      scanStatus.value = await client.rescanCatalog();
      await loadCatalog();
    } catch (caught) {
      error.value = caught instanceof Error ? caught.message : "Could not rescan the library";
    } finally {
      scanning.value = false;
    }
  }

  const stopFilterWatch = watch([query, selectedCategory, selectedInstructor, selectedTag], () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => void loadCatalog(), debounceMilliseconds);
  });

  onScopeDispose(() => {
    clearTimeout(searchTimer);
    requestSequence++;
    stopFilterWatch();
  });

  return {
    catalog,
    error,
    hasActiveFilters,
    initializeCatalog,
    libraryTitle,
    loading,
    query,
    rescanCatalog,
    scanning,
    scanStatus,
    selectedCategory,
    selectedFilters,
    selectedInstructor,
    selectedTag,
  };
}
