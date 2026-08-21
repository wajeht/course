<script setup lang="ts">
import type { DeepReadonly } from "vue";

import type { LibraryDto } from "@/api.js";
import PlaylistCard from "@/components/PlaylistCard.vue";

defineProps<{ playlists: DeepReadonly<LibraryDto["playlists"]> }>();
</script>

<template>
  <div
    class="grid grid-cols-4 gap-x-[clamp(18px,2vw,30px)] gap-y-8 max-[1120px]:grid-cols-3 max-[860px]:grid-cols-2 max-[600px]:grid-cols-1"
  >
    <PlaylistCard v-for="playlist in playlists" :key="playlist.id" :playlist="playlist" />
  </div>
</template>
