<script setup lang="ts">
import { RouterLink } from "vue-router";

import type { CatalogDto } from "@/api.js";
import CourseCoverPlaceholder from "@/components/CourseCoverPlaceholder.vue";
import ProgressBar from "@/components/ui/ProgressBar.vue";
import { durationText } from "@/utils.js";

defineProps<{ course: CatalogDto["courses"][number] }>();
</script>

<template>
  <article
    class="group flex min-w-0 flex-col overflow-hidden rounded-[10px] border border-line bg-white shadow-[0_8px_30px_rgb(24_32_29_/_5%)] transition-[transform,box-shadow,border-color] duration-[220ms] hover:-translate-y-1 hover:border-[#b9c6be] hover:shadow-course max-[600px]:grid max-[600px]:grid-cols-[125px_minmax(0,1fr)]"
  >
    <RouterLink
      :to="{ name: 'course', params: { courseId: course.id } }"
      class="relative aspect-[4/4.7] overflow-hidden bg-mist max-[600px]:min-h-[175px] max-[600px]:aspect-auto"
      :aria-label="`Open ${course.title}`"
    >
      <img
        v-if="course.coverUrl"
        class="h-full w-full object-cover transition-transform duration-[450ms] ease-[cubic-bezier(.2,.7,.2,1)] group-hover:scale-[1.025]"
        :src="course.coverUrl"
        :alt="`${course.title} cover`"
        loading="lazy"
      />
      <CourseCoverPlaceholder v-else class="h-full w-full" :title="course.title" />
      <div
        class="absolute right-3 bottom-3 rounded-[5px] border border-white/18 bg-pine-deep/88 px-[9px] py-1.5 text-[.66rem] font-bold text-white backdrop-blur-[6px] max-[600px]:hidden"
      >
        {{ course.lessonCount }} lessons
      </div>
    </RouterLink>
    <div class="flex flex-1 flex-col p-[18px]">
      <p class="mb-2 text-[.64rem] font-extrabold tracking-[.13em] text-belt uppercase">
        {{ course.category }}
      </p>
      <h3 class="min-h-[2.6em] text-[.98rem] leading-[1.3] max-[600px]:min-h-0">
        <RouterLink
          :to="{ name: 'course', params: { courseId: course.id } }"
          class="line-clamp-2 overflow-hidden hover:text-pine"
        >
          {{ course.title }}
        </RouterLink>
      </h3>
      <p v-if="course.instructors.length" class="mt-[7px] truncate text-[.73rem] text-pine">
        <template v-for="(instructor, index) in course.instructors" :key="instructor">
          <span v-if="index" aria-hidden="true">, </span>
          <RouterLink
            :to="{ name: 'instructor', params: { instructorName: instructor } }"
            class="font-semibold underline decoration-pine/25 underline-offset-[3px] hover:decoration-pine"
          >
            {{ instructor }}
          </RouterLink>
        </template>
      </p>
      <p class="mt-[5px] mb-5 text-[.73rem] text-muted">
        {{ durationText(course.durationSeconds) }}
      </p>
      <div
        v-if="course.progressPercent > 0"
        class="mt-auto grid grid-cols-[1fr_auto] items-center gap-[10px]"
      >
        <ProgressBar :value="course.progressPercent" compact />
        <span class="text-[.68rem] font-extrabold text-pine"> {{ course.progressPercent }}% </span>
      </div>
    </div>
  </article>
</template>
