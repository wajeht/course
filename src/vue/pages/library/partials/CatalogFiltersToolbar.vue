<script setup lang="ts">
import { computed, shallowRef } from "vue";
import type { CatalogDto } from "@/api.js";
import AppButton from "@/components/ui/AppButton.vue";
import PanelCard from "@/components/ui/PanelCard.vue";
import CatalogFilterGroup from "@/pages/library/partials/CatalogFilterGroup.vue";
import CatalogSearchInput from "@/pages/library/partials/CatalogSearchInput.vue";

type FilterType = "category" | "instructor" | "tag";

const props = defineProps<{
  categories: CatalogDto["categories"];
  instructors: CatalogDto["instructors"];
  tags: CatalogDto["tags"];
}>();

const category = defineModel<string[]>("category", { required: true });
const instructor = defineModel<string[]>("instructor", { required: true });
const query = defineModel<string>("query", { required: true });
const tag = defineModel<string[]>("tag", { required: true });

const activeMobilePanel = shallowRef<FilterType | null>(null);
const mobileFilterButtons = computed(() => [
  { label: "Categories", type: "category" as const, values: category.value },
  { label: "Instructors", type: "instructor" as const, values: instructor.value },
  { label: "Tags", type: "tag" as const, values: tag.value },
]);

const mobilePanel = computed(() => {
  const panel = activeMobilePanel.value;
  if (panel === "category") {
    return { allLabel: "All categories", options: props.categories, title: "Categories", type: panel };
  }
  if (panel === "instructor") {
    return { allLabel: "All instructors", options: props.instructors, title: "Instructors", type: panel };
  }
  if (panel === "tag") {
    return { allLabel: "All tags", options: props.tags, title: "Tags", type: panel };
  }
  return null;
});

const mobilePanelValue = computed({
  get: () => {
    if (activeMobilePanel.value === "category") return category.value;
    if (activeMobilePanel.value === "instructor") return instructor.value;
    if (activeMobilePanel.value === "tag") return tag.value;
    return [];
  },
  set: (values: string[]) => {
    if (activeMobilePanel.value === "category") category.value = values;
    if (activeMobilePanel.value === "instructor") instructor.value = values;
    if (activeMobilePanel.value === "tag") tag.value = values;
  },
});

function togglePanel(panel: FilterType): void {
  activeMobilePanel.value = activeMobilePanel.value === panel ? null : panel;
}
</script>

<template>
  <div>
    <aside class="hidden min-[761px]:block">
      <div class="grid gap-[clamp(18px,2vw,30px)]">
        <CatalogSearchInput v-model="query" />

        <PanelCard padding="compact">
          <CatalogFilterGroup
            v-model="category"
            all-label="All categories"
            label="Categories"
            name="catalog-desktop-category"
            :options="props.categories"
          />
        </PanelCard>

        <PanelCard padding="compact">
          <CatalogFilterGroup
            v-model="instructor"
            all-label="All instructors"
            label="Instructors"
            name="catalog-desktop-instructor"
            :options="props.instructors"
          />
        </PanelCard>

        <PanelCard padding="compact">
          <CatalogFilterGroup
            v-model="tag"
            all-label="All tags"
            label="Tags"
            name="catalog-desktop-tag"
            :options="props.tags"
          />
        </PanelCard>
      </div>
    </aside>

    <div class="hidden max-[760px]:block">
      <CatalogSearchInput v-model="query" class="mb-3" />

      <div class="flex flex-wrap gap-2">
        <AppButton
          v-for="button in mobileFilterButtons"
          :key="button.type"
          size="sm"
          variant="secondary"
          :class="button.values.length ? 'border-pine! bg-porcelain!' : ''"
          :aria-pressed="activeMobilePanel === button.type"
          :data-mobile-filter="button.type"
          @click="togglePanel(button.type)"
        >
          {{
            button.values.length === 1
              ? `${button.label}: ${button.values[0]}`
              : button.values.length > 1
                ? `${button.label} (${button.values.length})`
                : button.label
          }}
        </AppButton>
      </div>

      <PanelCard v-if="mobilePanel" class="mt-4" padding="compact" data-mobile-filter-panel>
        <div class="mb-3 flex items-center justify-between">
          <h2 class="text-[.76rem] font-extrabold uppercase tracking-[.08em] text-muted">
            {{ mobilePanel.title }}
          </h2>
          <AppButton
            variant="unstyled"
            class="grid h-8 w-8 place-items-center text-xl leading-none text-muted hover:text-ink"
            :aria-label="`Close ${mobilePanel.title.toLowerCase()} filters`"
            @click="activeMobilePanel = null"
          >
            ×
          </AppButton>
        </div>
        <CatalogFilterGroup
          v-model="mobilePanelValue"
          :all-label="mobilePanel.allLabel"
          hide-label
          :label="mobilePanel.title"
          :name="`catalog-mobile-${mobilePanel.type}`"
          :options="mobilePanel.options"
        />
      </PanelCard>
    </div>
  </div>
</template>
