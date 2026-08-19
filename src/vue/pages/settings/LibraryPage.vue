<script setup lang="ts">
import { useQuery, useQueryClient } from "@tanstack/vue-query";
import { computed, ref, watch } from "vue";

import { api, type CatalogPageSize } from "@/api.js";
import AlertMessage from "@/components/ui/AlertMessage.vue";
import AppButton from "@/components/ui/AppButton.vue";
import AppSelect from "@/components/ui/AppSelect.vue";
import FormField from "@/components/ui/FormField.vue";
import PanelCard from "@/components/ui/PanelCard.vue";
import PanelCardHeader from "@/components/ui/PanelCardHeader.vue";
import { useAsyncAction } from "@/composables/useAsyncAction.js";
import { useToast } from "@/composables/useToast.js";
import SettingsLayout from "@/pages/partials/SettingsLayout.vue";
import { queryKeys, scanStatusQueryOptions, settingsQueryOptions } from "@/queries.js";
import { countText } from "@/utils.js";

const queryClient = useQueryClient();
const scanRequest = useQuery(scanStatusQueryOptions());
const settingsRequest = useQuery(settingsQueryOptions());
const toast = useToast();
const catalogPageSize = ref<CatalogPageSize>(24);
const scanStatus = computed(() => scanRequest.data.value);
const lastRefreshText = computed(() => {
  const completedAt = scanStatus.value?.completedAt;
  if (!completedAt) return "";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(completedAt));
});
const rescanAction = useAsyncAction(() => api.rescanCatalog(), {
  errorMessage: "Could not refresh the library",
  onSuccess: async (status) => {
    queryClient.setQueryData(queryKeys.scanStatus, status);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.catalog, refetchType: "none" }),
      queryClient.invalidateQueries({ queryKey: queryKeys.courses, refetchType: "none" }),
    ]);
    if (status.status === "complete") toast.success("Library refreshed");
  },
});
const settingsAction = useAsyncAction(() => api.updateSettings(catalogPageSize.value), {
  errorMessage: "Could not save library settings",
  onSuccess: async (settings) => {
    queryClient.setQueryData(queryKeys.settings, settings);
    await queryClient.invalidateQueries({ queryKey: queryKeys.catalog, refetchType: "none" });
    catalogPageSize.value = settings.catalogPageSize;
    toast.success("Library settings saved");
  },
});
const scanError = computed(() => {
  if (rescanAction.errorMessage.value) return rescanAction.errorMessage.value;
  if (scanStatus.value?.status === "failed") {
    return "The library could not be refreshed. Check that your video folder is available, then try again.";
  }
  const caught = scanRequest.error.value;
  if (!caught) return "";
  if (caught instanceof Error) return caught.message;
  return "Could not load library status";
});
const settingsError = computed(() => {
  if (settingsAction.errorMessage.value) return settingsAction.errorMessage.value;
  const caught = settingsRequest.error.value;
  if (!caught) return "";
  if (caught instanceof Error) return caught.message;
  return "Could not load settings";
});

watch(settingsRequest.data, (settings) => {
  if (settings) catalogPageSize.value = settings.catalogPageSize;
});

async function rescanCatalog(): Promise<void> {
  await rescanAction.run();
}

async function saveSettings(): Promise<void> {
  if (!settingsRequest.data.value) return;
  await settingsAction.run();
}
</script>

<template>
  <SettingsLayout>
    <section
      id="settings-library-panel"
      class="col-span-3 grid gap-[clamp(18px,2vw,30px)] max-[1120px]:col-span-2 max-[860px]:col-span-1"
      aria-labelledby="settings-library-link"
    >
      <AlertMessage v-if="scanError" size="lg">
        {{ scanError }}
      </AlertMessage>
      <AlertMessage v-if="settingsError" size="lg">
        {{ settingsError }}
      </AlertMessage>

      <PanelCard class="min-h-[260px]" padding="none">
        <PanelCardHeader
          title="Refresh library"
          description="Check your video folders now for new or changed courses."
        />
        <div
          class="flex min-h-[180px] flex-col items-start justify-between gap-8 p-[clamp(22px,4vw,34px)]"
          data-scan-controls
        >
          <div class="min-w-0">
            <div class="grid gap-6" aria-live="polite">
              <div data-library-status>
                <p class="text-xs font-bold tracking-[.08em] text-pine uppercase">Library status</p>
                <p
                  class="mt-2 text-sm"
                  :class="{
                    'font-semibold text-clay': scanStatus?.status === 'failed',
                    'font-semibold text-belt':
                      scanStatus?.status !== 'failed' && Boolean(scanStatus?.warnings.length),
                    'text-muted': scanStatus?.status !== 'failed' && !scanStatus?.warnings.length,
                  }"
                >
                  <template v-if="scanStatus?.status === 'failed'">Refresh failed</template>
                  <template v-else-if="scanStatus?.completedAt">
                    <template v-if="scanStatus.warnings.length">
                      {{ countText(scanStatus.warnings.length, "library issue") }}
                    </template>
                    <template v-else>
                      {{ countText(scanStatus.courseCount, "course") }} ·
                      {{ countText(scanStatus.lessonCount, "lesson") }}
                    </template>
                  </template>
                  <template v-else>Library status is loading…</template>
                </p>
                <p
                  v-if="
                    scanStatus?.status !== 'failed' &&
                    scanStatus?.completedAt &&
                    scanStatus.warnings.length
                  "
                  class="mt-1.5 text-xs leading-5 text-muted"
                >
                  {{ countText(scanStatus.courseCount, "course") }} ·
                  {{ countText(scanStatus.lessonCount, "lesson") }}
                </p>
              </div>

              <div v-if="scanStatus?.completedAt" data-last-refresh>
                <p class="text-xs font-bold tracking-[.08em] text-pine uppercase">
                  <template v-if="scanStatus.status === 'failed'">Last refresh attempt</template>
                  <template v-else>Last refreshed</template>
                </p>
                <time class="mt-2 block text-sm text-muted" :datetime="scanStatus.completedAt">
                  {{ lastRefreshText }}
                </time>
              </div>
            </div>
            <div
              v-if="scanStatus?.warnings.length"
              class="mt-5 rounded-[7px] border border-belt/25 bg-[#fffaf0] p-4"
            >
              <p class="text-[.78rem] leading-5 text-muted">
                Review these files, correct each listed problem, then refresh the library.
              </p>
              <ul class="mt-3 grid gap-3" aria-label="Library issues">
                <li
                  v-for="warning in scanStatus.warnings"
                  :key="`${warning.path}:${warning.message}`"
                  class="grid gap-1 text-[.78rem] leading-5"
                >
                  <code class="break-all font-semibold text-pine-deep">{{ warning.path }}</code>
                  <span class="text-muted">{{ warning.message }}</span>
                </li>
              </ul>
            </div>
          </div>
          <AppButton
            class="self-end max-[600px]:w-full"
            :loading="rescanAction.pending.value"
            loading-label="Refreshing…"
            @click="rescanCatalog"
          >
            Refresh library
          </AppButton>
        </div>
      </PanelCard>

      <PanelCard padding="none">
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
    </section>
  </SettingsLayout>
</template>
