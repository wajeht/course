import { useQuery, useQueryClient } from "@tanstack/vue-query";
import { computed, shallowRef, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import { api, apiErrorMessage, type LibraryPageSize } from "@/api.js";
import { useAsyncAction } from "@/composables/useAsyncAction.js";
import { queryKeys, settingsQueryOptions } from "@/queries.js";

export function useLibraryPageSize() {
  const route = useRoute();
  const router = useRouter();
  const queryClient = useQueryClient();
  const settingsRequest = useQuery(settingsQueryOptions());
  const selectedSize = shallowRef<LibraryPageSize>(24);
  const saveAction = useAsyncAction(
    (libraryPageSize: LibraryPageSize) => api.updateSettings(libraryPageSize),
    {
      errorMessage: "Could not save library settings",
      onSuccess: async (settings) => {
        queryClient.setQueryData(queryKeys.settings, settings);
        if (route.query.page) {
          const query = { ...route.query };
          delete query.page;
          await router.replace({ query });
        }
        await queryClient.invalidateQueries({ queryKey: queryKeys.library });
      },
    },
  );

  watch(
    () => settingsRequest.data.value,
    (settings) => {
      if (settings) selectedSize.value = settings.libraryPageSize;
    },
    { immediate: true },
  );

  const libraryPageSize = computed({
    get: () => selectedSize.value,
    set: (value) => {
      void savePageSize(value);
    },
  });
  const disabled = computed(
    () =>
      settingsRequest.isPending.value || !settingsRequest.data.value || saveAction.pending.value,
  );
  const error = computed(() => {
    if (saveAction.errorMessage.value) return saveAction.errorMessage.value;
    const caught = settingsRequest.error.value;
    if (!caught) return "";
    return apiErrorMessage(caught, "Could not load settings");
  });

  async function savePageSize(value: LibraryPageSize): Promise<void> {
    const current = settingsRequest.data.value?.libraryPageSize;
    if (!current || value === current) return;
    selectedSize.value = value;
    const result = await saveAction.run(value);
    if (result === undefined) selectedSize.value = current;
  }

  return {
    disabled,
    error,
    libraryPageSize,
    pending: saveAction.pending,
  };
}
