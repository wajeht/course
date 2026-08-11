<script setup lang="ts">
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import { computed } from "vue";

import { api } from "../api";
import PageHeader from "../components/PageHeader.vue";
import StandardPageLayout from "../layouts/StandardPageLayout.vue";
import { catalogKeys, scanKeys } from "../queries/queryKeys.js";

const queryClient = useQueryClient();
const scanQuery = useQuery({
  queryKey: scanKeys.all,
  queryFn: () => api.getScanStatus(),
});
const rescanMutation = useMutation({
  mutationFn: () => api.rescanCatalog(),
  onSuccess(status) {
    queryClient.setQueryData(scanKeys.all, status);
    void queryClient.invalidateQueries({ queryKey: catalogKeys.all });
  },
});

const scanStatus = computed(() => scanQuery.data.value ?? null);
const scanning = computed(() => rescanMutation.isPending.value);
const error = computed(() => {
  const caught = rescanMutation.error.value ?? scanQuery.error.value;
  return caught instanceof Error ? caught.message : caught ? "Could not load scan status" : "";
});
</script>

<template>
  <StandardPageLayout>
    <PageHeader
      eyebrow="Course library"
      title="Settings"
      description="Manage how your course library finds and updates local content."
    />

    <div
      v-if="error"
      class="mt-8 rounded-lg border border-[#e8b7ae] bg-[#f8e5e1] px-[18px] py-[14px] text-[.88rem] text-[#6c241c]"
    >
      {{ error }}
    </div>

    <section
      class="mt-10 rounded-[10px] border border-line bg-white p-[clamp(22px,4vw,34px)] shadow-course"
    >
      <div
        class="flex items-center justify-between gap-6 max-[600px]:flex-col max-[600px]:items-start"
      >
        <div>
          <h2 class="text-lg font-[750]">Library scan</h2>
          <p class="mt-1.5 max-w-[500px] text-[.85rem] leading-6 text-muted">
            Scan your video folders now to find new or changed courses.
          </p>
          <p v-if="scanStatus?.completedAt" class="mt-3 text-[.74rem] font-semibold text-pine">
            {{
              scanStatus.warnings.length
                ? `${scanStatus.warnings.length} scan warnings`
                : `${scanStatus.courseCount} courses · ${scanStatus.lessonCount} lessons`
            }}
          </p>
        </div>
        <button
          class="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-[7px] bg-pine px-5 text-[.78rem] font-[750] text-white transition-[transform,background] duration-[160ms] enabled:hover:-translate-y-px enabled:hover:bg-pine-deep disabled:cursor-wait disabled:opacity-55 max-[600px]:w-full"
          :disabled="scanning"
          @click="rescanMutation.mutate()"
        >
          <svg
            class="w-4 fill-none stroke-current stroke-[1.8]"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M20 7v5h-5M4 17v-5h5m10.1-3A8 8 0 0 0 5.5 6M4.9 15A8 8 0 0 0 18.5 18" />
          </svg>
          {{ scanning ? "Scanning…" : "Rescan library" }}
        </button>
      </div>
    </section>
  </StandardPageLayout>
</template>
