<script setup lang="ts">
import { useQuery, useQueryClient } from "@tanstack/vue-query";
import { computed, shallowRef, watch } from "vue";

import { api, apiErrorMessage, type CatalogPageSize } from "@/api.js";
import AlertMessage from "@/components/ui/AlertMessage.vue";
import AppButton from "@/components/ui/AppButton.vue";
import AppSelect from "@/components/ui/AppSelect.vue";
import FormField from "@/components/ui/FormField.vue";
import PanelCard from "@/components/ui/PanelCard.vue";
import PanelCardHeader from "@/components/ui/PanelCardHeader.vue";
import { useAsyncAction } from "@/composables/useAsyncAction.js";
import { useToast } from "@/composables/useToast.js";
import { queryKeys, settingsQueryOptions } from "@/queries.js";

const queryClient = useQueryClient();
const settingsRequest = useQuery(settingsQueryOptions());
const toast = useToast();
const catalogPageSize = shallowRef<CatalogPageSize>(24);
const settingsAction = useAsyncAction(() => api.updateSettings(catalogPageSize.value), {
  errorMessage: "Could not save library settings",
  onSuccess: async (settings) => {
    queryClient.setQueryData(queryKeys.settings, settings);
    await queryClient.invalidateQueries({ queryKey: queryKeys.catalog, refetchType: "none" });
    catalogPageSize.value = settings.catalogPageSize;
    toast.success("Library settings saved");
  },
});
const settingsError = computed(() => {
  if (settingsAction.errorMessage.value) return settingsAction.errorMessage.value;
  const caught = settingsRequest.error.value;
  if (!caught) return "";
  return apiErrorMessage(caught, "Could not load settings");
});

watch(settingsRequest.data, (settings) => {
  if (settings) catalogPageSize.value = settings.catalogPageSize;
});

async function saveSettings(): Promise<void> {
  if (!settingsRequest.data.value) return;
  await settingsAction.run();
}
</script>

<template>
  <AlertMessage v-if="settingsError" size="lg">
    {{ settingsError }}
  </AlertMessage>

  <PanelCard :elevated="false" padding="none">
    <PanelCardHeader
      title="Library display"
      description="Choose how many courses appear on each library page."
    />
    <form
      class="flex flex-col items-stretch gap-8 p-[clamp(22px,4vw,34px)]"
      data-library-display-form
      @submit.prevent="saveSettings"
    >
      <FormField
        v-slot="field"
        class="w-full max-w-xs"
        label="Courses per page"
        help-text="This becomes the default for library and instructor pages."
      >
        <AppSelect
          :id="field.inputId"
          v-model="catalogPageSize"
          :aria-describedby="field.describedBy"
          :disabled="
            settingsRequest.isPending.value ||
            !settingsRequest.data.value ||
            settingsAction.pending.value
          "
          class="w-full"
        >
          <option :value="12">12</option>
          <option :value="24">24</option>
          <option :value="48">48</option>
          <option :value="96">96</option>
        </AppSelect>
      </FormField>
      <AppButton
        class="self-end max-[600px]:w-full"
        type="submit"
        :disabled="settingsRequest.isPending.value || !settingsRequest.data.value"
        :loading="settingsAction.pending.value"
        loading-label="Saving…"
      >
        Save changes
      </AppButton>
    </form>
  </PanelCard>
</template>
