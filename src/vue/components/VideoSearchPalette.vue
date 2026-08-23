<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query";
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  onScopeDispose,
  shallowRef,
  watch,
} from "vue";
import { useRouter } from "vue-router";

import { api, apiErrorMessage, type LibraryDto } from "@/api.js";
import IntentRouterLink from "@/components/IntentRouterLink.vue";
import AppButton from "@/components/ui/AppButton.vue";
import AppInput from "@/components/ui/AppInput.vue";
import { useModalDialog } from "@/composables/useModalDialog.js";
import { useRoutePrefetch } from "@/composables/useRoutePrefetch.js";
import { libraryQueryOptions } from "@/queries.js";

type Video = LibraryDto["videos"][number];

const router = useRouter();
const prefetch = useRoutePrefetch();
const open = shallowRef(false);
const query = shallowRef("");
const debouncedQuery = shallowRef("");
const activeIndex = shallowRef(-1);
const searchTerm = computed(() => query.value.trim());
const searchReady = computed(
  () => searchTerm.value.length >= 2 && debouncedQuery.value === searchTerm.value,
);
const request = useQuery(
  computed(() => ({
    ...libraryQueryOptions({ query: debouncedQuery.value, pageSize: 20 }, api),
    enabled: open.value && debouncedQuery.value.length >= 2,
    placeholderData: undefined,
  })),
);
const suggestions = computed(() => {
  if (!searchReady.value) return [];
  const term = debouncedQuery.value.toLocaleLowerCase();
  return [...(request.data.value?.videos ?? [])]
    .sort((left, right) => {
      const rank = (video: Video): number => {
        const title = video.title.toLocaleLowerCase();
        if (title === term) return 0;
        if (title.startsWith(term)) return 1;
        if (title.includes(term)) return 2;
        return 3;
      };
      return rank(left) - rank(right) || left.title.localeCompare(right.title);
    })
    .slice(0, 8);
});
const activeResultId = computed(() => {
  const selected = suggestions.value[activeIndex.value];
  return selected ? `video-search-result-${selected.id}` : undefined;
});
const error = computed(() => {
  const caught = request.error.value;
  return caught ? apiErrorMessage(caught, "Could not search videos") : "";
});

let searchTimer: ReturnType<typeof setTimeout> | undefined;
watch(searchTerm, (value) => {
  clearTimeout(searchTimer);
  activeIndex.value = -1;
  if (value.length < 2) {
    debouncedQuery.value = "";
    return;
  }
  searchTimer = setTimeout(() => {
    debouncedQuery.value = value;
  }, 150);
});
watch(suggestions, () => {
  activeIndex.value = -1;
});
onScopeDispose(() => clearTimeout(searchTimer));

function openPalette(): void {
  open.value = true;
}

function closePalette(): void {
  open.value = false;
  query.value = "";
  debouncedQuery.value = "";
  activeIndex.value = -1;
}

const { handleBackdrop, handleCancel } = useModalDialog(() => open.value, closePalette);

function handleShortcut(event: KeyboardEvent): void {
  if (!(event.metaKey || event.ctrlKey) || event.altKey || event.key.toLowerCase() !== "k") return;
  event.preventDefault();
  if (open.value) closePalette();
  else openPalette();
}

function moveSelection(offset: number): void {
  if (!suggestions.value.length) return;
  const lastIndex = suggestions.value.length - 1;
  if (activeIndex.value < 0) activeIndex.value = offset > 0 ? 0 : lastIndex;
  else activeIndex.value = Math.min(lastIndex, Math.max(0, activeIndex.value + offset));
  const selected = suggestions.value[activeIndex.value];
  if (selected) void prefetch.video(selected.id).catch(() => undefined);
  void nextTick(() => {
    document.getElementById(activeResultId.value ?? "")?.scrollIntoView({ block: "nearest" });
  });
}

function videoContext(video: Video): string {
  return [
    ...new Set([...video.authors, ...(video.playlistTitle ? [video.playlistTitle] : [])]),
  ].join(" · ");
}

function submit(): void {
  const selected = suggestions.value[activeIndex.value];
  const submittedQuery = searchTerm.value;
  closePalette();
  if (selected) {
    void router.push({ name: "player", params: { videoId: selected.id } });
  } else if (submittedQuery) {
    void router.push({ name: "videos", query: { q: submittedQuery } });
  }
}

onMounted(() => document.addEventListener("keydown", handleShortcut));
onBeforeUnmount(() => document.removeEventListener("keydown", handleShortcut));
</script>

<template>
  <AppButton
    variant="outline-inverse"
    size="sm"
    class="h-9 text-[.72rem] text-white/70 hover:text-white max-[600px]:h-10"
    aria-label="Search videos"
    aria-keyshortcuts="Meta+K Control+K"
    @click="openPalette"
  >
    Search
    <kbd
      class="rounded border border-white/20 px-1.5 py-0.5 font-mono text-[.62rem] text-white/55 max-[600px]:hidden"
      >⌘K</kbd
    >
  </AppButton>

  <Teleport to="body">
    <dialog
      ref="dialog"
      aria-label="Search videos"
      class="mx-auto mt-[12vh] max-h-[min(640px,76vh)] w-[min(640px,calc(100%-32px))] overflow-hidden rounded-[12px] border border-line bg-white p-0 text-ink shadow-[0_24px_80px_rgb(10_25_18_/_32%)] backdrop:bg-[#07110c]/45 max-[600px]:mt-[max(12px,env(safe-area-inset-top))] max-[600px]:w-[calc(100%-24px)]"
      @cancel="handleCancel"
      @click="handleBackdrop"
    >
      <section @click.stop>
        <form @submit.prevent="submit">
          <div class="flex items-center gap-3 border-b border-line px-5 py-3 max-[600px]:px-4">
            <AppInput
              v-model="query"
              variant="bare"
              class="h-10 text-base"
              aria-label="Search video titles"
              aria-controls="video-search-results"
              :aria-activedescendant="activeResultId"
              :aria-expanded="searchTerm.length >= 2"
              aria-autocomplete="list"
              autocomplete="off"
              autofocus
              placeholder="Search video titles"
              role="combobox"
              @keydown.down.prevent="moveSelection(1)"
              @keydown.up.prevent="moveSelection(-1)"
            />
            <AppButton
              variant="secondary"
              size="sm"
              class="shrink-0 text-[.68rem]"
              aria-label="Close search"
              @click="closePalette"
            >
              <span class="max-[600px]:hidden">Esc</span>
              <span class="hidden max-[600px]:inline">Close</span>
            </AppButton>
          </div>

          <div
            v-if="searchTerm.length >= 2"
            id="video-search-results"
            class="max-h-[min(480px,60vh)] overflow-y-auto px-2 py-2"
            aria-live="polite"
          >
            <p v-if="!searchReady || request.isFetching.value" class="px-3 py-3 text-sm text-muted">
              Searching videos…
            </p>
            <p v-else-if="error" class="px-3 py-3 text-sm text-clay">{{ error }}</p>
            <p v-else-if="!suggestions.length" class="px-3 py-3 text-sm text-muted">
              No matching videos
            </p>
            <ul v-else aria-label="Video search results" role="listbox">
              <li v-for="(video, index) in suggestions" :key="video.id">
                <IntentRouterLink
                  :id="`video-search-result-${video.id}`"
                  :to="{ name: 'player', params: { videoId: video.id } }"
                  :prefetch="() => prefetch.video(video.id)"
                  class="block rounded-[7px] border-l-4 px-4 py-3 focus-visible:outline-none"
                  :class="
                    index === activeIndex
                      ? 'border-belt bg-pine text-white'
                      : 'border-transparent hover:bg-mist'
                  "
                  role="option"
                  :aria-selected="index === activeIndex"
                  @click="closePalette"
                  @pointerenter="activeIndex = index"
                >
                  <span
                    class="block truncate text-sm font-bold"
                    :class="index === activeIndex ? 'text-white' : 'text-ink'"
                  >
                    {{ video.title }}
                  </span>
                  <span
                    v-if="videoContext(video)"
                    class="mt-0.5 block truncate text-xs"
                    :class="index === activeIndex ? 'text-white/65' : 'text-muted'"
                  >
                    {{ videoContext(video) }}
                  </span>
                </IntentRouterLink>
              </li>
            </ul>
          </div>

          <footer
            class="flex items-center gap-5 border-t border-line px-5 py-3 text-[.68rem] text-muted max-[600px]:hidden"
          >
            <span><kbd class="font-mono">↑↓</kbd> Select</span>
            <span>
              <kbd class="font-mono">Enter</kbd>
              {{ activeIndex >= 0 ? "Open" : "Search all" }}
            </span>
            <span class="ml-auto"><kbd class="font-mono">Esc</kbd> Close</span>
          </footer>
        </form>
      </section>
    </dialog>
  </Teleport>
</template>
