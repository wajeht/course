<script setup lang="ts">
import { computed, shallowRef } from "vue";
import type { CatalogDto } from "@/api.js";
import AppButton from "@/components/ui/AppButton.vue";
import AppDrawer from "@/components/ui/AppDrawer.vue";
import PanelCard from "@/components/ui/PanelCard.vue";
import CatalogFilterGroup from "@/pages/library/partials/CatalogFilterGroup.vue";
import CatalogSearchInput from "@/pages/library/partials/CatalogSearchInput.vue";

type FilterType = "category" | "author" | "tag";

const props = defineProps<{
  categories: CatalogDto["categories"];
  hasActiveFilters: boolean;
  authors: CatalogDto["authors"];
  tags: CatalogDto["tags"];
}>();

const emit = defineEmits<{ clear: [] }>();

const category = defineModel<string[]>("category", { required: true });
const author = defineModel<string[]>("author", { required: true });
const query = defineModel<string>("query", { required: true });
const tag = defineModel<string[]>("tag", { required: true });

const activeMobilePanel = shallowRef<FilterType | null>(null);
const mobileFilterButtons = computed(() => [
  {
    label: "Categories",
    singularLabel: "Category",
    type: "category" as const,
    values: category.value,
  },
  {
    label: "Authors",
    singularLabel: "Author",
    type: "author" as const,
    values: author.value,
  },
  { label: "Tags", singularLabel: "Tag", type: "tag" as const, values: tag.value },
]);

const mobilePanel = computed(() => {
  const panel = activeMobilePanel.value;
  if (panel === "category") {
    return {
      allLabel: "All categories",
      closeLabel: "Close category filters",
      options: props.categories,
      title: "Categories",
      type: panel,
    };
  }
  if (panel === "author") {
    return {
      allLabel: "All authors",
      closeLabel: "Close author filters",
      options: props.authors,
      title: "Authors",
      type: panel,
    };
  }
  if (panel === "tag") {
    return {
      allLabel: "All tags",
      closeLabel: "Close tag filters",
      options: props.tags,
      title: "Tags",
      type: panel,
    };
  }
  return null;
});

const mobilePanelValue = computed({
  get: () => {
    if (activeMobilePanel.value === "category") return category.value;
    if (activeMobilePanel.value === "author") return author.value;
    if (activeMobilePanel.value === "tag") return tag.value;
    return [];
  },
  set: (values: string[]) => {
    if (activeMobilePanel.value === "category") category.value = values;
    if (activeMobilePanel.value === "author") author.value = values;
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
        <div>
          <CatalogSearchInput v-model="query" :elevated="false" />
          <div v-if="props.hasActiveFilters" class="mt-2 flex justify-end">
            <AppButton
              data-clear-filters="desktop"
              variant="unstyled"
              class="inline-flex min-h-10 items-center text-[.75rem] font-bold text-pine underline decoration-pine/25 underline-offset-[3px] hover:decoration-pine"
              @click="emit('clear')"
            >
              Clear filters
            </AppButton>
          </div>
        </div>

        <PanelCard :elevated="false" padding="compact">
          <CatalogFilterGroup
            v-model="category"
            all-label="All categories"
            label="Categories"
            name="catalog-desktop-category"
            :options="props.categories"
          />
        </PanelCard>

        <PanelCard :elevated="false" padding="compact">
          <CatalogFilterGroup
            v-model="author"
            all-label="All authors"
            label="Authors"
            name="catalog-desktop-author"
            :options="props.authors"
          />
        </PanelCard>

        <PanelCard :elevated="false" padding="compact">
          <CatalogFilterGroup
            v-model="tag"
            all-label="All tags"
            :collapsed-limit="10"
            label="Tags"
            name="catalog-desktop-tag"
            :options="props.tags"
          />
        </PanelCard>
      </div>
    </aside>

    <div class="hidden max-[760px]:block">
      <CatalogSearchInput v-model="query" class="mb-3" :elevated="false" />

      <div data-testid="mobile-filter-actions" class="flex flex-wrap gap-2">
        <AppButton
          v-for="button in mobileFilterButtons"
          :key="button.type"
          size="sm"
          variant="secondary"
          :class="['min-h-10!', button.values.length ? 'border-pine! bg-porcelain!' : '']"
          :aria-expanded="activeMobilePanel === button.type"
          :aria-pressed="activeMobilePanel === button.type"
          :data-mobile-filter="button.type"
          @click="togglePanel(button.type)"
        >
          {{
            button.values.length === 1
              ? `${button.singularLabel}: ${button.values[0]}`
              : button.values.length > 1
                ? `${button.label} (${button.values.length})`
                : button.label
          }}
        </AppButton>
        <AppButton
          v-if="props.hasActiveFilters"
          data-clear-filters="mobile"
          variant="unstyled"
          class="inline-flex min-h-10 items-center text-[.75rem] font-bold text-pine underline decoration-pine/25 underline-offset-[3px] hover:decoration-pine"
          @click="emit('clear')"
        >
          Clear filters
        </AppButton>
      </div>
    </div>

    <AppDrawer
      v-if="mobilePanel"
      :open="true"
      :title="mobilePanel.title"
      :close-label="mobilePanel.closeLabel"
      @close="activeMobilePanel = null"
    >
      <CatalogFilterGroup
        v-model="mobilePanelValue"
        :all-label="mobilePanel.allLabel"
        hide-label
        :label="mobilePanel.title"
        :name="`catalog-mobile-${mobilePanel.type}`"
        :options="mobilePanel.options"
      />
    </AppDrawer>
  </div>
</template>
