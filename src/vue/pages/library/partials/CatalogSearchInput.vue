<script setup lang="ts">
import { useId } from "vue";

import AppButton from "@/components/ui/AppButton.vue";
import AppInput from "@/components/ui/AppInput.vue";

const props = withDefaults(defineProps<{ elevated?: boolean }>(), { elevated: true });
const query = defineModel<string>({ required: true });
const inputId = `catalog-search-${useId()}`;
</script>

<template>
  <div
    data-testid="catalog-search"
    class="flex min-h-10 items-center gap-2 rounded-[7px] border border-line bg-white px-3.5 focus-within:border-pine focus-within:shadow-[0_0_0_3px_rgb(36_77_59_/_10%)]"
    :class="props.elevated ? 'shadow-[0_8px_30px_rgb(24_32_29_/_5%)]' : ''"
  >
    <svg
      class="w-[18px] flex-none fill-none stroke-pine stroke-[1.7] [stroke-linecap:round]"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path d="m21 21-4.4-4.4m2.4-5.1a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z" />
    </svg>
    <label :for="inputId" class="sr-only">Search playlists and videos</label>
    <AppInput
      :id="inputId"
      v-model="query"
      class="w-full min-w-0 border-0 bg-transparent p-0 text-[.85rem] text-ink outline-0 placeholder:text-[#89918d] [&::-webkit-search-cancel-button]:hidden"
      variant="bare"
      type="search"
      placeholder="Search playlists and videos"
    />
    <AppButton
      v-if="query"
      variant="unstyled"
      class="grid h-8 w-8 flex-none place-items-center text-lg leading-none text-muted hover:text-ink"
      aria-label="Clear search"
      @click="query = ''"
    >
      ×
    </AppButton>
  </div>
</template>
