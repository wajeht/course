<script setup lang="ts">
import PanelCard from "@/components/ui/PanelCard.vue";

const sections = [
  { label: "Library", route: "/settings/library", value: "library" },
  { label: "Access", route: "/settings/access", value: "access" },
] as const;
</script>

<template>
  <PanelCard as="nav" class="p-8" padding="none" aria-label="Settings sections">
    <div class="grid gap-1 max-[760px]:grid-cols-2">
      <RouterLink
        v-for="section in sections"
        :key="section.value"
        v-slot="link"
        :to="section.route"
        custom
      >
        <a
          :id="`settings-${section.value}-link`"
          :href="link.href"
          :class="[
            'flex h-10 w-full items-center rounded-[7px] px-3.5 text-left text-[.82rem] font-bold transition-[background,color,box-shadow] duration-[160ms]',
            link.isExactActive
              ? 'bg-pine! text-white! shadow-[0_7px_18px_rgb(21_51_38_/_16%)]'
              : 'bg-transparent! text-pine! hover:bg-porcelain!',
          ]"
          :aria-controls="`settings-${section.value}-panel`"
          :aria-current="link.isExactActive ? 'page' : undefined"
          @click="link.navigate"
        >
          <span>{{ section.label }}</span>
        </a>
      </RouterLink>
    </div>
  </PanelCard>
</template>
