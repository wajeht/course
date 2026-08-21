<script setup lang="ts">
import type { LibraryDto } from "@/api.js";
import AppButton from "@/components/ui/AppButton.vue";
import AppInput from "@/components/ui/AppInput.vue";
import PanelCard from "@/components/ui/PanelCard.vue";
import LibraryFilterGroup from "@/pages/library/partials/LibraryFilterGroup.vue";
import LibraryPlaylistFilter from "@/pages/library/partials/LibraryPlaylistFilter.vue";

defineProps<{
  authors: LibraryDto["authors"];
  hasActiveFilters: boolean;
  tags: LibraryDto["tags"];
}>();
defineEmits<{ clear: [] }>();
const author = defineModel<string[]>("author", { required: true });
const query = defineModel<string>("query", { required: true });
const tag = defineModel<string[]>("tag", { required: true });
const view = defineModel<string>("view", { required: true });
</script>

<template>
  <aside class="grid gap-4">
    <AppInput
      v-model="query"
      :aria-label="view === 'playlists' ? 'Search playlists' : 'Search videos'"
      :placeholder="view === 'playlists' ? 'Search playlists' : 'Search videos'"
      type="search"
    />
    <AppButton
      v-if="hasActiveFilters"
      variant="unstyled"
      class="justify-self-start text-[.75rem] font-bold text-pine underline"
      @click="$emit('clear')"
      >Clear filters</AppButton
    >
    <PanelCard :elevated="false" padding="compact">
      <LibraryPlaylistFilter v-model="view" />
    </PanelCard>
    <PanelCard :elevated="false" padding="compact">
      <LibraryFilterGroup
        v-model="author"
        all-label="No authors"
        label="Authors"
        name="library-author"
        :options="authors"
      />
    </PanelCard>
    <PanelCard :elevated="false" padding="compact">
      <LibraryFilterGroup
        v-model="tag"
        all-label="No tags"
        label="Tags"
        name="library-tag"
        :options="tags"
      />
    </PanelCard>
  </aside>
</template>
