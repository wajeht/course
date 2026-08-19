<script setup lang="ts">
import { computed, useTemplateRef } from "vue";

import PlayerCurriculumSidebar from "@/pages/player/partials/PlayerCurriculumSidebar.vue";
import PlayerLessonDetails from "@/pages/player/partials/PlayerLessonDetails.vue";
import PlayerVideoStage from "@/pages/player/partials/PlayerVideoStage.vue";
import { useLessonPlayback } from "@/composables/useLessonPlayback.js";

const playerStage = useTemplateRef<InstanceType<typeof PlayerVideoStage>>("playerStage");
const video = computed(() => playerStage.value?.video ?? null);
const {
  applyResume,
  closeSidebar,
  course,
  currentTime,
  ended,
  error,
  lesson,
  loading,
  markComplete,
  nextLesson,
  playback,
  playbackRate,
  resetProgress,
  resetting,
  retryConversion,
  retrying,
  saveOnPause,
  saveOnTimeUpdate,
  seekToChapter,
  sidebarOpen,
  toggleSidebar,
  updatePlaybackRate,
} = useLessonPlayback(video);
</script>

<template>
  <main
    class="grid min-h-[calc(100vh-66px)] grid-cols-[minmax(0,1fr)_390px] bg-[#111714] max-[1120px]:grid-cols-[minmax(0,1fr)_330px] max-[860px]:block"
  >
    <section
      class="min-w-0 px-[clamp(20px,3vw,50px)] pt-6 pb-10 text-white max-[860px]:min-h-[calc(100vh-66px)] max-[600px]:px-3 max-[600px]:pt-[18px] max-[600px]:pb-[30px]"
    >
      <PlayerVideoStage
        ref="playerStage"
        :course
        :ended
        :error
        :loading
        :next-lesson="nextLesson"
        :playback
        :retrying
        @ended="markComplete"
        @loaded-metadata="applyResume"
        @open-lessons="toggleSidebar"
        @pause="saveOnPause"
        @retry="retryConversion"
        @time-update="saveOnTimeUpdate"
      />
      <PlayerLessonDetails
        v-model:playback-rate="playbackRate"
        :current-time="currentTime"
        :lesson
        :resetting
        @playback-rate-change="updatePlaybackRate"
        @reset="resetProgress"
        @seek="seekToChapter"
      />
    </section>
    <PlayerCurriculumSidebar
      :active-lesson-id="lesson?.id"
      :course
      :open="sidebarOpen"
      @close="closeSidebar"
    />
  </main>
</template>
