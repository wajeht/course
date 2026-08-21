<script setup lang="ts">
import { useQuery, useQueryClient } from "@tanstack/vue-query";
import { computed, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import { api, apiErrorMessage, isLibraryResourceNotFound } from "@/api.js";
import AuthorLinks from "@/components/AuthorLinks.vue";
import VideoCoverPlaceholder from "@/components/VideoCoverPlaceholder.vue";
import VideoRow from "@/components/VideoRow.vue";
import IntentRouterLink from "@/components/IntentRouterLink.vue";
import AlertMessage from "@/components/ui/AlertMessage.vue";
import AppButton from "@/components/ui/AppButton.vue";
import PageHeader from "@/components/ui/PageHeader.vue";
import PanelCard from "@/components/ui/PanelCard.vue";
import ProgressBar from "@/components/ui/ProgressBar.vue";
import { useAsyncAction } from "@/composables/useAsyncAction.js";
import { useConfirm } from "@/composables/useConfirm.js";
import { useRoutePrefetch } from "@/composables/useRoutePrefetch.js";
import { useToast } from "@/composables/useToast.js";
import { playlistQueryOptions, queryKeys } from "@/queries.js";
import { notFoundLocation } from "@/router.js";
import { countText, durationText, setPageTitle } from "@/utils.js";

const route = useRoute();
const router = useRouter();
const queryClient = useQueryClient();
const confirmation = useConfirm();
const toast = useToast();
const prefetch = useRoutePrefetch();
const playlistId = computed(() => String(route.params.playlistId));
const request = useQuery(computed(() => playlistQueryOptions(playlistId.value)));
const playlist = computed(() => request.data.value);
const videos = computed(() => playlist.value?.sections.flatMap((section) => section.videos) ?? []);
const nextVideo = computed(() => videos.value.find((video) => !video.completed) ?? videos.value[0]);
const error = computed(() => {
  const caught = request.error.value;
  return caught ? apiErrorMessage(caught, "Could not load this playlist") : "";
});
const reset = useAsyncAction(
  async () => {
    const id = playlistId.value;
    const confirmed = await confirmation.confirm({
      title: "Reset playlist progress?",
      message: "This clears progress for every video in this playlist.",
      confirmLabel: "Reset playlist",
      variant: "danger",
    });
    if (!confirmed || id !== playlistId.value) return;
    await api.resetPlaylist(id);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.library }),
      queryClient.invalidateQueries({ queryKey: queryKeys.playlist(id) }),
    ]);
    toast.success("Playlist progress reset");
  },
  { errorMessage: "Could not reset playlist progress" },
);

watch(request.error, async (caught) => {
  if (caught && isLibraryResourceNotFound(caught))
    await router.replace(notFoundLocation(route.path));
});
watch(
  playlist,
  (value) => {
    if (value) setPageTitle(value.title);
  },
  { immediate: true },
);
</script>

<template>
  <main v-if="playlist">
    <section
      class="bg-pine-deep px-[max(4vw,calc((100vw-1380px)/2))] py-[clamp(42px,6vw,78px)] text-white max-[600px]:px-5"
    >
      <div
        class="mx-auto grid max-w-[1380px] grid-cols-[minmax(240px,360px)_minmax(0,1fr)] items-center gap-[clamp(30px,6vw,80px)] max-[700px]:grid-cols-1"
      >
        <div
          class="aspect-video overflow-hidden rounded-[10px] bg-pine shadow-[0_28px_70px_rgb(0_0_0_/_32%)]"
        >
          <img
            v-if="playlist.coverUrl"
            class="h-full w-full object-cover"
            :src="playlist.coverUrl"
            :alt="`${playlist.title} cover`"
          />
          <VideoCoverPlaceholder v-else class="h-full w-full" :title="playlist.title" />
        </div>
        <div>
          <p class="mb-2 text-[.68rem] font-extrabold tracking-[.18em] text-belt uppercase">
            Playlist · {{ countText(playlist.videoCount, "video") }} ·
            {{ durationText(playlist.durationSeconds) }}
          </p>
          <h1
            class="font-display text-[clamp(2.2rem,5vw,5rem)] leading-[.98] font-extrabold tracking-[-.04em]"
          >
            {{ playlist.title }}
          </h1>
          <AuthorLinks
            v-if="playlist.authors.length"
            class="mt-4 block text-sm text-belt-light"
            :authors="playlist.authors"
          />
          <p v-if="playlist.description" class="mt-5 max-w-[700px] text-white/72">
            {{ playlist.description }}
          </p>
          <div v-if="playlist.tags.length" class="mt-5 flex flex-wrap gap-2">
            <span
              v-for="tag in playlist.tags"
              :key="tag"
              class="rounded-full border border-white/20 px-3 py-1 text-xs text-white/75"
              >{{ tag }}</span
            >
          </div>
          <ProgressBar
            v-if="playlist.progressPercent"
            class="mt-6 max-w-[560px]"
            :value="playlist.progressPercent"
            light
          />
          <div class="mt-6 flex gap-3">
            <AppButton
              v-if="nextVideo"
              :as="IntentRouterLink"
              :to="{ name: 'player', params: { videoId: nextVideo.id } }"
              :prefetch="() => prefetch.video(nextVideo!.id)"
              variant="accent"
              size="lg"
              >▶ {{ nextVideo.positionSeconds ? "Resume" : "Play" }}</AppButton
            >
            <AppButton
              v-if="playlist.progressPercent"
              variant="outline-inverse"
              :loading="reset.pending.value"
              @click="reset.run()"
              >Reset progress</AppButton
            >
          </div>
        </div>
      </div>
    </section>
    <section
      class="mx-auto w-[min(1380px,calc(100%-8vw))] py-[clamp(48px,7vw,90px)] max-[700px]:w-[calc(100%-40px)]"
    >
      <PageHeader class="mb-6" eyebrow="Playlist" title="Videos" :heading-level="2" />
      <PanelCard
        v-for="section in playlist.sections"
        :key="section.id ?? 'direct'"
        class="mb-5"
        padding="none"
      >
        <h3
          class="border-b border-pine/15 bg-mist px-5 py-4 font-display text-sm font-extrabold tracking-[.08em] text-pine-deep uppercase"
        >
          {{ section.title }}
        </h3>
        <VideoRow
          v-for="(video, index) in section.videos"
          :key="video.id"
          :video="video"
          :index="index"
        />
      </PanelCard>
    </section>
  </main>
  <div
    v-else-if="request.isPending.value"
    class="grid min-h-[60vh] place-items-center"
    role="status"
  >
    Loading playlist…
  </div>
  <AlertMessage v-else-if="error" class="m-8">{{ error }}</AlertMessage>
</template>
