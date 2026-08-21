<script setup lang="ts">
import { RouterLink } from "vue-router";

import type { CourseDetailDto, LessonDto } from "@/api.js";
import CourseCoverPlaceholder from "@/components/CourseCoverPlaceholder.vue";
import IntentRouterLink from "@/components/IntentRouterLink.vue";
import AppButton from "@/components/ui/AppButton.vue";
import AppIcon from "@/components/ui/AppIcon.vue";
import ProgressBar from "@/components/ui/ProgressBar.vue";
import { useRoutePrefetch } from "@/composables/useRoutePrefetch.js";
import { countText, durationText } from "@/utils.js";

defineProps<{
  course: CourseDetailDto;
  hasStarted: boolean;
  nextLesson?: LessonDto;
  resetting: boolean;
}>();

const emit = defineEmits<{ reset: [] }>();
const prefetch = useRoutePrefetch();
</script>

<template>
  <section
    class="grid grid-cols-[minmax(260px,390px)_minmax(0,1fr)] gap-[clamp(36px,6vw,92px)] bg-pine-deep bg-[radial-gradient(circle_at_83%_20%,rgb(196_147_63_/_16%),transparent_30%),repeating-linear-gradient(90deg,transparent_0_52px,rgb(255_255_255_/_2%)_52px_53px)] px-[max(4vw,calc((100vw-1380px)/2))] py-[clamp(52px,7vw,90px)] text-white max-[860px]:grid-cols-[minmax(180px,260px)_minmax(0,1fr)] max-[860px]:gap-[34px] max-[600px]:grid-cols-1 max-[600px]:gap-5 max-[600px]:px-5 max-[600px]:pt-10 max-[600px]:pb-12"
  >
    <div
      class="aspect-[4/5] self-center overflow-hidden rounded-[10px] border border-white/18 bg-pine shadow-[0_28px_70px_rgb(0_0_0_/_32%)] max-[600px]:w-full max-[600px]:self-start"
    >
      <img
        v-if="course.coverUrl"
        class="h-full w-full object-cover"
        :src="course.coverUrl"
        :alt="`${course.title} cover`"
      />
      <CourseCoverPlaceholder v-else class="h-full w-full" :title="course.title" />
    </div>
    <div class="max-w-[800px] self-center">
      <p class="mb-[9px] text-[.68rem] font-extrabold tracking-[.18em] text-belt uppercase">
        <template v-if="course.category !== 'Uncategorized'">{{ course.category }} · </template>
        {{ countText(course.lessonCount, "lesson") }} · {{ durationText(course.durationSeconds) }}
      </p>
      <h1
        class="mb-[23px] max-w-[880px] font-display text-[clamp(2.7rem,5.2vw,5.8rem)] leading-[.95] font-extrabold tracking-[-.05em] max-[860px]:text-[clamp(2.3rem,6.4vw,4rem)] max-[600px]:text-[clamp(1.8rem,8vw,2.7rem)]"
      >
        {{ course.title }}
      </h1>
      <p
        v-if="course.instructors.length"
        class="-mt-3 mb-4 text-[.78rem] font-bold tracking-[.04em] text-belt-light"
      >
        Taught by
        <template v-for="(instructor, index) in course.instructors" :key="instructor">
          <span v-if="index" aria-hidden="true">, </span>
          <IntentRouterLink
            :to="{ name: 'instructor', params: { instructorName: instructor } }"
            :prefetch="() => prefetch.instructor(instructor)"
            class="underline decoration-belt-light/35 underline-offset-4 hover:decoration-belt-light"
          >
            {{ instructor }}
          </IntentRouterLink>
        </template>
      </p>
      <p
        class="max-w-[700px] text-[clamp(.95rem,1.4vw,1.12rem)] leading-[1.65] text-white/72 max-[600px]:col-span-full max-[600px]:text-[.86rem]"
        :class="course.tags.length ? 'mb-5' : 'mb-[34px]'"
      >
        {{ course.description || "Your course, ready whenever you are." }}
      </p>
      <div
        v-if="course.tags.length"
        class="mb-[30px] flex max-w-[700px] flex-wrap gap-2 max-[600px]:col-span-full"
        aria-label="Course topics"
      >
        <span
          v-for="tag in course.tags"
          :key="tag"
          class="rounded-full border border-white/20 bg-white/8 px-3 py-1 text-[.68rem] font-semibold text-white/78"
        >
          {{ tag }}
        </span>
      </div>
      <div v-if="hasStarted" class="mb-[30px] max-w-[620px] max-[600px]:col-span-full">
        <div class="mb-[10px] flex justify-between text-[.74rem] font-[650] text-white/68">
          <span>Course progress</span>
          <strong class="text-white">{{ course.progressPercent }}%</strong>
        </div>
        <ProgressBar :value="course.progressPercent" light />
      </div>
      <div class="flex flex-wrap gap-[10px] max-[600px]:col-span-full">
        <AppButton
          v-if="nextLesson"
          :as="RouterLink"
          :to="{ name: 'player', params: { lessonId: nextLesson.id } }"
          variant="accent"
          size="lg"
        >
          <AppIcon name="play" class="size-3.5" />
          {{ nextLesson.positionSeconds ? "Resume course" : "Start course" }}
        </AppButton>
        <AppButton
          v-if="hasStarted"
          variant="outline-inverse"
          size="lg"
          :loading="resetting"
          loading-label="Resetting…"
          @click="emit('reset')"
        >
          Reset progress
        </AppButton>
      </div>
    </div>
  </section>
</template>
