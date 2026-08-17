<script setup lang="ts">
import { computed } from "vue";

import CourseCoverPlaceholder from "@/components/CourseCoverPlaceholder.vue";
import AppButton from "@/components/ui/AppButton.vue";
import AppLogo from "@/components/ui/AppLogo.vue";
import { readCatalogSnapshot } from "@/catalog-cache.js";
import { countText } from "@/utils.js";

defineEmits<{ retry: [] }>();

const snapshot = readCatalogSnapshot();
const courses = computed(() => snapshot?.catalog.courses.slice(0, 4) ?? []);
const savedAt = computed(() => {
  if (!snapshot) return "";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(snapshot.savedAt));
});
</script>

<template>
  <main class="grid min-h-screen place-items-center bg-porcelain px-5 py-10">
    <section
      class="w-full max-w-[760px] overflow-hidden rounded-[12px] border border-line bg-white shadow-course"
    >
      <header class="bg-pine-deep px-7 py-6 text-white sm:px-9">
        <AppLogo />
        <p class="mt-3 text-sm leading-6 text-white/68">Your server cannot be reached right now.</p>
      </header>

      <div class="px-7 py-8 sm:px-9 sm:py-9">
        <p class="text-xs font-bold tracking-[.1em] text-belt uppercase">Connection paused</p>
        <h1 class="mt-2 font-display text-3xl font-extrabold text-ink">Course is offline</h1>
        <p class="mt-3 max-w-xl text-sm leading-6 text-muted">
          Reconnect to your Course server, then try again. Previously saved library information is
          shown below.
        </p>

        <div v-if="snapshot" class="mt-7 border-t border-line pt-6">
          <div class="flex items-end justify-between gap-4">
            <div>
              <p class="text-xs font-bold tracking-[.08em] text-pine uppercase">Saved library</p>
              <p class="mt-1.5 text-sm font-semibold text-pine-deep">
                {{ countText(snapshot.catalog.pagination.totalCourses, "course") }}
              </p>
            </div>
            <time class="text-right text-xs text-muted" :datetime="snapshot.savedAt">
              Saved {{ savedAt }}
            </time>
          </div>

          <ul v-if="courses.length" class="mt-5 grid grid-cols-2 gap-3 max-[560px]:grid-cols-1">
            <li
              v-for="course in courses"
              :key="course.id"
              class="grid grid-cols-[52px_minmax(0,1fr)] items-center gap-3 rounded-[8px] border border-line bg-porcelain p-2.5"
            >
              <img
                v-if="course.coverUrl"
                class="h-[52px] w-[52px] rounded-[5px] object-cover"
                :src="course.coverUrl"
                alt=""
              />
              <CourseCoverPlaceholder
                v-else
                class="h-[52px] w-[52px] rounded-[5px] text-xs"
                :title="course.title"
              />
              <div class="min-w-0">
                <p class="truncate text-sm font-semibold text-ink">{{ course.title }}</p>
                <p class="mt-1 text-xs text-muted">{{ countText(course.lessonCount, "lesson") }}</p>
              </div>
            </li>
          </ul>
        </div>

        <AppButton class="mt-7 max-[560px]:w-full" size="lg" @click="$emit('retry')">
          Try again
        </AppButton>
      </div>
    </section>
  </main>
</template>
