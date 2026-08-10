<script setup lang="ts">
import { RouterLink } from "vue-router";

import type { CatalogDto } from "../api";
import { durationText } from "../utils/format";
import ProgressBar from "./ProgressBar.vue";

defineProps<{ course: CatalogDto["courses"][number] }>();
</script>

<template>
  <RouterLink
    :to="{ name: 'course', params: { courseId: course.id } }"
    class="group flex min-w-0 flex-col overflow-hidden rounded-[10px] border border-line bg-white shadow-[0_8px_30px_rgb(24_32_29_/_5%)] transition-[transform,box-shadow,border-color] duration-[220ms] hover:-translate-y-1 hover:border-[#b9c6be] hover:shadow-course max-[600px]:grid max-[600px]:grid-cols-[125px_minmax(0,1fr)]"
  >
    <div
      class="relative aspect-[4/4.7] overflow-hidden bg-mist max-[600px]:min-h-[175px] max-[600px]:aspect-auto"
    >
      <img
        v-if="course.coverUrl"
        class="h-full w-full object-cover transition-transform duration-[450ms] ease-[cubic-bezier(.2,.7,.2,1)] group-hover:scale-[1.025]"
        :src="course.coverUrl"
        :alt="`${course.title} cover`"
        loading="lazy"
      />
      <div
        v-else
        class="grid h-full w-full place-items-center bg-pine bg-[linear-gradient(135deg,transparent_49%,rgb(255_255_255_/_12%)_50%,transparent_51%)] bg-[length:30px_30px] font-display text-[2rem] font-black tracking-[.12em] text-white/65"
        aria-hidden="true"
      >
        COURSE
      </div>
      <div
        class="absolute right-3 bottom-3 rounded-[5px] border border-white/18 bg-pine-deep/88 px-[9px] py-1.5 text-[.66rem] font-bold text-white backdrop-blur-[6px] max-[600px]:hidden"
      >
        {{ course.lessonCount }} lessons
      </div>
    </div>
    <div class="flex flex-1 flex-col p-[18px]">
      <p class="mb-2 text-[.64rem] font-extrabold tracking-[.13em] text-belt uppercase">
        {{ course.category }}
      </p>
      <h3
        class="line-clamp-2 min-h-[2.6em] overflow-hidden text-[.98rem] leading-[1.3] max-[600px]:min-h-0"
      >
        {{ course.title }}
      </h3>
      <p
        v-if="course.instructors.length"
        class="mt-[7px] truncate text-[.73rem] font-semibold text-pine"
      >
        {{ course.instructors.join(", ") }}
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
  </RouterLink>
</template>
