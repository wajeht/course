<script setup lang="ts">
import type { CatalogDto } from "@/api.js";
import CourseFilterSelect from "@/components/CourseFilterSelect.vue";
import AppInput from "@/components/ui/AppInput.vue";

defineProps<{
  categories: CatalogDto["categories"];
  instructors: CatalogDto["instructors"];
  tags: CatalogDto["tags"];
}>();

const category = defineModel<string>("category", { required: true });
const instructor = defineModel<string>("instructor", { required: true });
const query = defineModel<string>("query", { required: true });
const tag = defineModel<string>("tag", { required: true });
</script>

<template>
  <div class="mb-7 flex flex-wrap items-stretch gap-2">
    <CourseFilterSelect
      v-model="category"
      label="Category"
      all-label="All categories"
      :options="categories"
    >
      <svg
        class="w-[17px] flex-none fill-none stroke-pine stroke-[1.7] [stroke-linecap:round]"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path d="M4 5.5h6.5V12H4zM13.5 5.5H20V12h-6.5zM4 15h6.5M13.5 15H20" />
      </svg>
    </CourseFilterSelect>
    <CourseFilterSelect
      v-model="instructor"
      label="Instructor"
      all-label="All instructors"
      :options="instructors"
    >
      <svg
        class="w-[17px] flex-none fill-none stroke-pine stroke-[1.7] [stroke-linecap:round]"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle cx="12" cy="8" r="3.5" />
        <path d="M5.5 20c.5-4.1 2.7-6.2 6.5-6.2s6 2.1 6.5 6.2" />
      </svg>
    </CourseFilterSelect>
    <CourseFilterSelect v-model="tag" label="Tag" all-label="All tags" :options="tags">
      <svg
        class="w-[17px] flex-none fill-none stroke-pine stroke-[1.7] [stroke-linecap:round] [stroke-linejoin:round]"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path d="m4 12 8.5-8.5H20V11l-8.5 8.5L4 12Z" />
        <circle cx="16.5" cy="7" r="1" />
      </svg>
    </CourseFilterSelect>
    <label
      class="flex min-h-10 min-w-[240px] flex-1 items-center gap-2.5 rounded-[7px] border border-line bg-white px-3.5 shadow-[0_8px_30px_rgb(24_32_29_/_5%)] focus-within:border-pine focus-within:shadow-[0_0_0_3px_rgb(36_77_59_/_10%)] max-[700px]:w-full max-[700px]:min-w-0"
    >
      <svg
        class="w-[18px] flex-none fill-none stroke-pine stroke-[1.7] [stroke-linecap:round]"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path d="m21 21-4.4-4.4m2.4-5.1a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z" />
      </svg>
      <span class="sr-only">Search courses and lessons</span>
      <AppInput
        v-model="query"
        class="w-full min-w-0 border-0 bg-transparent p-0 text-[.85rem] text-ink outline-0 placeholder:text-[#89918d]"
        variant="bare"
        type="search"
        placeholder="Search courses and lessons"
      />
    </label>
  </div>
</template>
