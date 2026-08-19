<script setup lang="ts">
import { computed, ref, type Ref } from "vue";
import type { CatalogDto } from "@/api.js";
import AppInput from "@/components/ui/AppInput.vue";

type FilterType = "category" | "instructor" | "tag";
type FilterPanel = FilterType | null;
type FilterOption = CatalogDto["categories"][number];
type FilterPanelContext = {
  title: string;
  options: FilterOption[];
  model: Ref<string>;
} | null;

const props = defineProps<{
  categories: CatalogDto["categories"];
  instructors: CatalogDto["instructors"];
  tags: CatalogDto["tags"];
}>();

const category = defineModel<string>("category", { required: true });
const instructor = defineModel<string>("instructor", { required: true });
const query = defineModel<string>("query", { required: true });
const tag = defineModel<string>("tag", { required: true });

const activeMobilePanel = ref<FilterPanel>(null);

const mobilePanelOptions = computed<FilterPanelContext>(() => {
  if (activeMobilePanel.value === "category") return { title: "Categories", options: props.categories, model: category };
  if (activeMobilePanel.value === "instructor")
    return { title: "Instructors", options: props.instructors, model: instructor };
  if (activeMobilePanel.value === "tag") return { title: "Tags", options: props.tags, model: tag };
  return null;
});

function showPanel(panel: FilterType): void {
  activeMobilePanel.value = panel;
}

function hidePanel(): void {
  activeMobilePanel.value = null;
}

function toggleFilter(filter: Ref<string>, option: string): void {
  filter.value = filter.value === option ? "" : option;
}

function clearSearch(): void {
  query.value = "";
}
</script>

<template>
  <div>
    <aside class="hidden md:block">
      <section class="rounded-[10px] border border-line bg-white p-4 shadow-[0_8px_30px_rgb(24_32_29_/_5%)]">
        <h2 class="mb-2 text-[.76rem] font-extrabold uppercase tracking-[.08em] text-muted">Search</h2>
        <label
          class="mb-5 flex min-h-10 items-center gap-2 rounded-[7px] border border-line bg-white px-3.5 shadow-[0_8px_30px_rgb(24_32_29_/_5%)] focus-within:border-pine focus-within:shadow-[0_0_0_3px_rgb(36_77_59_/_10%)]"
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
          <button
            v-if="query"
            type="button"
            class="text-lg leading-none text-muted transition-colors hover:text-ink"
            aria-label="Clear search"
            @click="clearSearch"
          >
            ×
          </button>
        </label>
        <div class="mt-5 space-y-5">
          <section>
            <h3 class="mb-2 text-[.72rem] font-extrabold uppercase tracking-[.08em] text-muted">Categories</h3>
            <ul class="space-y-2 text-[.86rem]">
              <li v-for="option in props.categories" :key="option.name">
                <label class="flex cursor-pointer items-center gap-2.5 text-pine-deep">
                  <input
                    type="checkbox"
                    :checked="category === option.name"
                    class="h-[14px] w-[14px] cursor-pointer rounded-[3px] border border-line bg-white text-pine focus:outline-none focus-visible:ring-2 focus-visible:ring-pine"
                    @change="toggleFilter(category, option.name)"
                  />
                  <span>{{ option.name }} ({{ option.courseCount }})</span>
                </label>
              </li>
            </ul>
          </section>
          <section>
            <h3 class="mb-2 text-[.72rem] font-extrabold uppercase tracking-[.08em] text-muted">Instructors</h3>
            <ul class="space-y-2 text-[.86rem]">
              <li v-for="option in props.instructors" :key="option.name">
                <label class="flex cursor-pointer items-center gap-2.5 text-pine-deep">
                  <input
                    type="checkbox"
                    :checked="instructor === option.name"
                    class="h-[14px] w-[14px] cursor-pointer rounded-[3px] border border-line bg-white text-pine focus:outline-none focus-visible:ring-2 focus-visible:ring-pine"
                    @change="toggleFilter(instructor, option.name)"
                  />
                  <span>{{ option.name }} ({{ option.courseCount }})</span>
                </label>
              </li>
            </ul>
          </section>
          <section>
            <h3 class="mb-2 text-[.72rem] font-extrabold uppercase tracking-[.08em] text-muted">Tags</h3>
            <ul class="space-y-2 text-[.86rem]">
              <li v-for="option in props.tags" :key="option.name">
                <label class="flex cursor-pointer items-center gap-2.5 text-pine-deep">
                  <input
                    type="checkbox"
                    :checked="tag === option.name"
                    class="h-[14px] w-[14px] cursor-pointer rounded-[3px] border border-line bg-white text-pine focus:outline-none focus-visible:ring-2 focus-visible:ring-pine"
                    @change="toggleFilter(tag, option.name)"
                  />
                  <span>{{ option.name }} ({{ option.courseCount }})</span>
                </label>
              </li>
            </ul>
          </section>
        </div>
      </section>
    </aside>

    <div class="mb-4 md:hidden">
      <label
        class="mb-3 flex min-h-10 items-center gap-2 rounded-[7px] border border-line bg-white px-3.5 shadow-[0_8px_30px_rgb(24_32_29_/_5%)]"
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
        <button
          v-if="query"
          type="button"
          class="text-lg leading-none text-muted transition-colors hover:text-ink"
          aria-label="Clear search"
          @click="clearSearch"
        >
          ×
        </button>
      </label>

      <div class="flex gap-2">
        <button
          class="rounded-[999px] border border-line bg-white px-4 py-2 text-[.74rem] font-semibold tracking-[.05em]"
          type="button"
          @click="showPanel('category')"
        >
          Categories
        </button>
        <button
          class="rounded-[999px] border border-line bg-white px-4 py-2 text-[.74rem] font-semibold tracking-[.05em]"
          type="button"
          @click="showPanel('instructor')"
        >
          Instructors
        </button>
        <button
          class="rounded-[999px] border border-line bg-white px-4 py-2 text-[.74rem] font-semibold tracking-[.05em]"
          type="button"
          @click="showPanel('tag')"
        >
          Tags
        </button>
      </div>
    </div>

    <div
      v-if="activeMobilePanel"
      class="fixed inset-0 z-50 flex items-end justify-center md:hidden"
      role="dialog"
      aria-modal="true"
    >
      <div class="absolute inset-0 bg-black/45" @click="hidePanel" />
      <section class="relative z-10 w-full max-w-[420px] rounded-t-[22px] border border-line bg-white p-4">
        <div class="mb-3 flex items-center justify-between">
          <h3 class="text-[.9rem] font-extrabold uppercase tracking-[.08em] text-muted">
            {{ mobilePanelOptions?.title }}
          </h3>
          <button type="button" class="text-xl leading-none text-muted" aria-label="Close filters" @click="hidePanel">
            ×
          </button>
        </div>
        <div class="max-h-[56vh] overflow-auto">
          <ul class="space-y-2 text-[.9rem]">
            <li v-for="option in mobilePanelOptions?.options" :key="option.name">
              <label class="flex items-center gap-2.5">
                <input
                  type="checkbox"
                  :checked="mobilePanelOptions?.model?.value === option.name"
                  class="h-[14px] w-[14px] rounded-[3px] border border-line bg-white text-pine focus:outline-none focus-visible:ring-2 focus-visible:ring-pine"
                  @change="mobilePanelOptions?.model && toggleFilter(mobilePanelOptions.model, option.name)"
                />
                <span>{{ option.name }} ({{ option.courseCount }})</span>
              </label>
            </li>
          </ul>
        </div>
      </section>
    </div>
  </div>
</template>
