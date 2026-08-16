<script setup lang="ts">
import { computed } from "vue";
import { RouterLink } from "vue-router";

import { api } from "@/api.js";
import CourseCoverPlaceholder from "@/components/CourseCoverPlaceholder.vue";
import AlertMessage from "@/components/ui/AlertMessage.vue";
import AppButton from "@/components/ui/AppButton.vue";
import EmptyState from "@/components/ui/EmptyState.vue";
import PageHeader from "@/components/ui/PageHeader.vue";
import ProgressBar from "@/components/ui/ProgressBar.vue";
import { useAsyncData } from "@/composables/useAsyncData.js";
import StandardPageLayout from "@/layouts/StandardPageLayout.vue";

const catalogRequest = useAsyncData(({ signal }) => api.getCatalog({}, signal));
const continueWatching = computed(() => catalogRequest.data.value?.continueWatching ?? []);
const error = computed(() => {
  const caught = catalogRequest.error.value;
  return caught instanceof Error ? caught.message : caught ? "Could not load your courses" : "";
});
</script>

<template>
  <StandardPageLayout>
    <AlertMessage v-if="error" class="mb-7" size="lg">
      {{ error }}
    </AlertMessage>

    <section>
      <PageHeader class="mb-6" eyebrow="Home" title="Continue watching" :heading-level="1" />

      <div
        v-if="catalogRequest.loading.value"
        class="grid auto-cols-[minmax(300px,420px)] grid-flow-col gap-4 overflow-hidden"
        aria-label="Loading courses"
      >
        <div
          v-for="index in 3"
          :key="index"
          class="min-h-[230px] animate-pulse rounded-[10px] bg-[#e9ece8]"
        />
      </div>
      <div
        v-else-if="continueWatching.length"
        class="-mx-1 grid auto-cols-[minmax(300px,420px)] grid-flow-col gap-4 overflow-x-auto px-1 pt-1 pb-[18px] [scroll-snap-type:x_proximity] max-[600px]:auto-cols-[86vw]"
      >
        <RouterLink
          v-for="lesson in continueWatching"
          :key="lesson.id"
          :to="{ name: 'player', params: { lessonId: lesson.id } }"
          class="group relative min-h-[230px] overflow-hidden rounded-[10px] bg-pine text-white shadow-course [scroll-snap-align:start]"
        >
          <img
            v-if="lesson.courseCoverUrl"
            class="absolute inset-0 h-full w-full object-cover transition-transform duration-[400ms] group-hover:scale-[1.035] motion-reduce:transition-none"
            :src="lesson.courseCoverUrl"
            :alt="`${lesson.courseTitle} cover`"
          />
          <CourseCoverPlaceholder
            v-else
            class="absolute inset-0 h-full w-full"
            :title="lesson.courseTitle"
          />
          <div
            class="absolute inset-0 h-full w-full bg-[linear-gradient(90deg,rgb(12_28_21_/_96%)_0%,rgb(12_28_21_/_72%)_55%,rgb(12_28_21_/_30%)_100%)]"
          />
          <div class="absolute right-[25px] bottom-[23px] left-[25px] z-[2]">
            <p
              class="mb-[7px] max-w-[80%] text-[.65rem] font-[750] tracking-[.08em] text-belt-light uppercase"
            >
              {{ lesson.courseTitle }}
            </p>
            <h2 class="mb-5 max-w-[85%] text-xl leading-[1.15]">{{ lesson.title }}</h2>
            <ProgressBar :value="lesson.progressPercent" label="Lesson progress" compact />
          </div>
          <span
            class="absolute top-5 right-5 z-[3] grid h-[42px] w-[42px] place-items-center rounded-full bg-white pl-0.5 text-[.75rem] text-pine-deep"
            aria-hidden="true"
          >
            ▶
          </span>
        </RouterLink>
      </div>
      <EmptyState
        v-else
        title="Nothing in progress"
        description="Start a course from your library and it will appear here."
        :heading-level="2"
      >
        <template #icon>▶</template>
        <template #actions>
          <AppButton :as="RouterLink" to="/library" size="lg">Browse library</AppButton>
        </template>
      </EmptyState>
    </section>
  </StandardPageLayout>
</template>
