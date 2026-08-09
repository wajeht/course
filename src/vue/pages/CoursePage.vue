<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { RouterLink, useRoute } from "vue-router";

import { api, type CourseDetailDto } from "../client";
import LessonRow from "../components/LessonRow.vue";
import ProgressBar from "../components/ProgressBar.vue";
import { durationText } from "../utils/format";

const route = useRoute();
const course = ref<CourseDetailDto | null>(null);
const loading = ref(true);
const resetting = ref(false);
const error = ref("");

const allLessons = computed(
  () => course.value?.sections.flatMap((section) => section.lessons) ?? [],
);
const nextLesson = computed(
  () => allLessons.value.find((lesson) => !lesson.completed) ?? allLessons.value.at(0),
);

async function loadCourse(): Promise<void> {
  loading.value = true;
  error.value = "";
  try {
    course.value = await api.getCourse(String(route.params.courseId));
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : "Could not load this course";
  } finally {
    loading.value = false;
  }
}

async function resetProgress(): Promise<void> {
  if (!course.value || !window.confirm("Reset all lesson progress for this course?")) return;
  resetting.value = true;
  try {
    await api.resetCourse(course.value.id);
    await loadCourse();
  } finally {
    resetting.value = false;
  }
}

watch(
  () => route.params.courseId,
  () => void loadCourse(),
  { immediate: true },
);
</script>

<template>
  <main v-if="course" class="course-page">
    <section class="course-hero">
      <div class="course-hero__cover">
        <img v-if="course.coverUrl" :src="course.coverUrl" :alt="`${course.title} cover`" />
        <div v-else class="course-card__fallback">COURSE</div>
      </div>
      <div class="course-hero__details">
        <RouterLink to="/" class="back-link">← Library</RouterLink>
        <p class="eyebrow">
          {{ course.lessonCount }} lessons · {{ durationText(course.durationSeconds) }}
        </p>
        <h1>{{ course.title }}</h1>
        <p class="course-description">
          {{ course.description || "Your private course, ready whenever you are." }}
        </p>
        <div class="hero-progress">
          <div>
            <span>Course progress</span><strong>{{ course.progressPercent }}%</strong>
          </div>
          <ProgressBar :value="course.progressPercent" />
        </div>
        <div class="hero-actions">
          <RouterLink
            v-if="nextLesson"
            :to="{ name: 'player', params: { lessonId: nextLesson.id } }"
            class="button button--primary"
          >
            <span aria-hidden="true">▶</span>
            {{ nextLesson.positionSeconds ? "Resume course" : "Start course" }}
          </RouterLink>
          <button class="button button--quiet" :disabled="resetting" @click="resetProgress">
            {{ resetting ? "Resetting…" : "Reset progress" }}
          </button>
        </div>
      </div>
    </section>

    <section class="course-curriculum page-shell">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Ordered practice</p>
          <h2>Course curriculum</h2>
        </div>
        <span>{{ course.completedCount }} of {{ course.lessonCount }} completed</span>
      </div>
      <article
        v-for="section in course.sections"
        :key="section.id ?? 'direct'"
        class="curriculum-section"
      >
        <header>
          <h3>{{ section.title }}</h3>
          <span>{{ section.lessons.length }} lessons</span>
        </header>
        <LessonRow
          v-for="(lesson, index) in section.lessons"
          :key="lesson.id"
          :lesson="lesson"
          :index="index"
        />
      </article>
    </section>
  </main>

  <main v-else class="page-shell state-page">
    <div v-if="loading" class="loading-mark" aria-label="Loading" />
    <div v-else class="empty-state">
      <h1>Course unavailable</h1>
      <p>{{ error }}</p>
      <RouterLink to="/" class="button button--primary">Back to library</RouterLink>
    </div>
  </main>
</template>
