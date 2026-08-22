<script setup lang="ts">
withDefaults(defineProps<{ hideLabel?: boolean; name?: string }>(), {
  hideLabel: false,
  name: "library-playlist",
});
const selected = defineModel<string>({ required: true });
</script>

<template>
  <fieldset>
    <legend
      :class="
        hideLabel
          ? 'sr-only'
          : 'mb-3 text-[.72rem] font-extrabold tracking-[.08em] text-pine uppercase'
      "
    >
      View
    </legend>
    <ul class="space-y-2 text-[.86rem]">
      <li>
        <label class="flex cursor-pointer items-center gap-2.5 text-pine-deep max-[760px]:min-h-11">
          <input
            v-model="selected"
            type="radio"
            :name="name"
            value="videos"
            class="h-4 w-4 border-line text-pine focus-visible:ring-pine"
          />
          <span>All videos</span>
        </label>
      </li>
      <li>
        <label class="flex cursor-pointer items-center gap-2.5 text-pine-deep max-[760px]:min-h-11">
          <input
            v-model="selected"
            type="radio"
            :name="name"
            value="playlists"
            class="h-4 w-4 border-line text-pine focus-visible:ring-pine"
          />
          <span>Playlists</span>
        </label>
      </li>
    </ul>
  </fieldset>
</template>
