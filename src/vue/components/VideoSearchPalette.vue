<script setup lang="ts">
import VideoSearchResults from "@/components/VideoSearchResults.vue";
import AppButton from "@/components/ui/AppButton.vue";
import AppInput from "@/components/ui/AppInput.vue";
import { useModalDialog } from "@/composables/useModalDialog.js";
import { useVideoSearchPalette } from "@/composables/useVideoSearchPalette.js";

const {
  activateResult,
  activeIndex,
  activeResultId,
  closePalette,
  error,
  loading,
  moveSelection,
  open,
  query,
  searchStarted,
  submit,
  suggestions,
} = useVideoSearchPalette();
const { handleBackdrop, handleCancel } = useModalDialog(() => open.value, closePalette);
</script>

<template>
  <Teleport to="body">
    <dialog
      ref="dialog"
      aria-label="Search videos"
      class="mx-auto mt-[12vh] max-h-[min(640px,76vh)] w-[min(640px,calc(100%-32px))] overflow-hidden rounded-[12px] border border-line bg-white p-0 text-ink shadow-[0_24px_80px_rgb(18_22_28_/_36%)] backdrop:bg-[#12161c]/45 max-[600px]:mt-[max(12px,env(safe-area-inset-top))] max-[600px]:w-[calc(100%-24px)]"
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
              :aria-expanded="searchStarted"
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

          <VideoSearchResults
            v-if="searchStarted"
            :active-index="activeIndex"
            :error
            :loading
            :videos="suggestions"
            @activate="activateResult"
            @close="closePalette"
          />

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
