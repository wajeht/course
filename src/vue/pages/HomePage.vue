<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { RouterLink } from "vue-router";

import { api, type CatalogDto, type ScanStatus } from "../api";
import CourseCard from "../components/CourseCard.vue";
import ProgressBar from "../components/ProgressBar.vue";

const catalog = ref<CatalogDto>({ courses: [], continueWatching: [] });
const scanStatus = ref<ScanStatus | null>(null);
const query = ref("");
const loading = ref(true);
const scanning = ref(false);
const error = ref("");
let searchTimer: ReturnType<typeof setTimeout> | undefined;

const courseById = computed(
  () => new Map(catalog.value.courses.map((course) => [course.id, course])),
);

async function loadCatalog(): Promise<void> {
  loading.value = true;
  error.value = "";
  try {
    catalog.value = await api.getCatalog(query.value || undefined);
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : "Could not load your library";
  } finally {
    loading.value = false;
  }
}

async function rescanCatalog(): Promise<void> {
  scanning.value = true;
  error.value = "";
  try {
    scanStatus.value = await api.rescanCatalog();
    await loadCatalog();
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : "Could not rescan the library";
  } finally {
    scanning.value = false;
  }
}

watch(query, () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => void loadCatalog(), 220);
});

onMounted(async () => {
  await Promise.all([
    loadCatalog(),
    api.getScanStatus().then((status) => {
      scanStatus.value = status;
    }),
  ]);
});
</script>

<template>
  <main class="page-shell home-page">
    <section class="library-intro">
      <div>
        <p class="eyebrow">Personal training room</p>
        <h1>Pick up where<br />the mat left off.</h1>
      </div>
      <div class="library-tools">
        <label class="search-field">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m21 21-4.4-4.4m2.4-5.1a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z" />
          </svg>
          <span class="sr-only">Search courses and lessons</span>
          <input v-model="query" type="search" placeholder="Search courses and lessons" />
        </label>
        <button class="button button--quiet" :disabled="scanning" @click="rescanCatalog">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M20 7v5h-5M4 17v-5h5m10.1-3A8 8 0 0 0 5.5 6M4.9 15A8 8 0 0 0 18.5 18" />
          </svg>
          {{ scanning ? "Scanning…" : "Rescan" }}
        </button>
      </div>
    </section>

    <div v-if="error" class="notice notice--error">{{ error }}</div>

    <section v-if="!query && catalog.continueWatching.length" class="content-section">
      <div class="section-heading">
        <div>
          <p class="eyebrow">In progress</p>
          <h2>Continue watching</h2>
        </div>
      </div>
      <div class="continue-rail">
        <RouterLink
          v-for="lesson in catalog.continueWatching"
          :key="lesson.id"
          :to="{ name: 'player', params: { lessonId: lesson.id } }"
          class="continue-card"
        >
          <img
            v-if="courseById.get(lesson.courseId)?.coverUrl"
            :src="courseById.get(lesson.courseId)?.coverUrl ?? ''"
            :alt="`${lesson.courseTitle} cover`"
          />
          <div v-else class="continue-card__fallback" />
          <div class="continue-card__shade" />
          <div class="continue-card__content">
            <p>{{ lesson.courseTitle }}</p>
            <h3>{{ lesson.title }}</h3>
            <ProgressBar :value="lesson.progressPercent" compact />
          </div>
          <span class="continue-card__play" aria-hidden="true">▶</span>
        </RouterLink>
      </div>
    </section>

    <section class="content-section">
      <div class="section-heading">
        <div>
          <p class="eyebrow">{{ query ? "Search results" : "Your library" }}</p>
          <h2>{{ query ? `${catalog.courses.length} matching courses` : "All courses" }}</h2>
        </div>
        <span v-if="scanStatus?.completedAt" class="scan-note">
          {{
            scanStatus.warnings.length
              ? `${scanStatus.warnings.length} scan warnings`
              : "Library up to date"
          }}
        </span>
      </div>

      <div v-if="loading" class="course-grid" aria-label="Loading courses">
        <div v-for="index in 4" :key="index" class="course-card course-card--skeleton" />
      </div>
      <div v-else-if="catalog.courses.length" class="course-grid">
        <CourseCard v-for="course in catalog.courses" :key="course.id" :course="course" />
      </div>
      <div v-else class="empty-state">
        <span class="empty-state__mark" aria-hidden="true">⌁</span>
        <h3>{{ query ? "No lessons match that search" : "No courses found" }}</h3>
        <p>
          {{
            query
              ? "Try a technique, instructor, or course title."
              : "Add a course folder to /videos, then rescan."
          }}
        </p>
      </div>
    </section>
  </main>
</template>
