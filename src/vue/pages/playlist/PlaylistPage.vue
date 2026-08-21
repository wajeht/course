<script setup lang="ts">
import { useQuery, useQueryClient } from "@tanstack/vue-query";
import { computed, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import { api, apiErrorMessage, isCatalogResourceNotFound } from "@/api.js";
import CourseCurriculum from "@/pages/playlist/partials/CourseCurriculum.vue";
import CourseHero from "@/pages/playlist/partials/CourseHero.vue";
import IntentRouterLink from "@/components/IntentRouterLink.vue";
import AppButton from "@/components/ui/AppButton.vue";
import EmptyState from "@/components/ui/EmptyState.vue";
import { useAsyncAction } from "@/composables/useAsyncAction.js";
import { useConfirm } from "@/composables/useConfirm.js";
import { useRoutePrefetch } from "@/composables/useRoutePrefetch.js";
import { useToast } from "@/composables/useToast.js";
import { courseQueryOptions, queryKeys } from "@/queries.js";
import { notFoundLocation } from "@/router.js";
import { setPageTitle } from "@/utils.js";

const route = useRoute();
const router = useRouter();
const queryClient = useQueryClient();
const prefetch = useRoutePrefetch();
const courseId = computed(() => String(route.params.courseId));
const courseRequest = useQuery(computed(() => courseQueryOptions(courseId.value)));
const confirmation = useConfirm();
const toast = useToast();
const playlist = computed(() => courseRequest.data.value);
const loading = computed(() => courseRequest.isPending.value);
const allLessons = computed(
  () => playlist.value?.sections.flatMap((section) => section.videos) ?? [],
);
const hasStarted = computed(() =>
  allLessons.value.some((video) => video.completed || video.positionSeconds > 0),
);
const nextLesson = computed(
  () => allLessons.value.find((video) => !video.completed) ?? allLessons.value.at(0),
);

const resetAction = useAsyncAction(
  async (id: string) => {
    await api.resetCourse(id);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.catalog }),
      queryClient.invalidateQueries({ queryKey: queryKeys.playlist(id) }),
    ]);
  },
  {
    errorMessage: "Could not reset playlist progress",
    onSuccess: () => {
      toast.success("Playlist progress reset");
    },
  },
);
const error = computed(() => {
  if (resetAction.errorMessage.value) return resetAction.errorMessage.value;
  const caught = courseRequest.error.value;
  return caught ? apiErrorMessage(caught, "Could not load this playlist") : "";
});

async function resetProgress(): Promise<void> {
  if (!playlist.value) return;
  const targetCourseId = playlist.value.id;
  const confirmed = await confirmation.confirm({
    title: "Reset playlist progress?",
    message: "This resets every video in this playlist and cannot be undone.",
    confirmLabel: "Reset progress",
    variant: "danger",
  });
  if (!confirmed || playlist.value?.id !== targetCourseId) return;
  await resetAction.run(targetCourseId);
}

watch(
  [courseId, courseRequest.error],
  ([id, caught]) => {
    if (courseId.value === id && isCatalogResourceNotFound(caught)) {
      void router.replace(notFoundLocation(route.path));
    }
  },
  { immediate: true },
);
watch(
  courseRequest.data,
  (loadedCourse) => {
    if (loadedCourse) setPageTitle(loadedCourse.title);
  },
  { immediate: true },
);
</script>

<template>
  <main v-if="playlist">
    <CourseHero
      :playlist
      :has-started="hasStarted"
      :next-video="nextLesson"
      :resetting="resetAction.pending.value"
      @reset="resetProgress"
    />
    <CourseCurriculum :playlist />
  </main>

  <main
    v-else
    class="mx-auto grid min-h-[calc(100vh-66px)] w-[min(1380px,calc(100%-8vw))] place-items-center max-[860px]:w-[min(100%-40px,1380px)]"
  >
    <div
      v-if="loading"
      class="h-[42px] w-[42px] animate-spin rounded-full border-[3px] border-mist border-t-belt"
      aria-label="Loading playlist"
      role="status"
    />
    <EmptyState
      v-else
      title="Playlist unavailable"
      :description="error"
      :heading-level="1"
      :framed="false"
    >
      <template #actions>
        <AppButton :as="IntentRouterLink" to="/library" :prefetch="prefetch.library" size="lg">
          Back to library
        </AppButton>
      </template>
    </EmptyState>
  </main>
</template>
