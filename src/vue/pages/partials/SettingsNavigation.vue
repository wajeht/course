<script setup lang="ts">
import AppButton from "@/components/ui/AppButton.vue";
import PanelCard from "@/components/ui/PanelCard.vue";

export type SettingsSection = "auth" | "data";

const sections: ReadonlyArray<{ label: string; value: SettingsSection }> = [
  { label: "Library", value: "data" },
  { label: "Password & access", value: "auth" },
];

defineProps<{
  modelValue: SettingsSection;
}>();

const emit = defineEmits<{
  "update:modelValue": [section: SettingsSection];
}>();
</script>

<template>
  <PanelCard as="nav" class="p-8" padding="none" aria-label="Settings sections">
    <div class="grid gap-1 max-[760px]:grid-cols-2">
      <AppButton
        v-for="section in sections"
        :id="`settings-${section.value}-tab`"
        :key="section.value"
        :class="[
          'flex min-h-12 w-full items-center rounded-[7px] px-3.5 text-left text-[.82rem] font-bold transition-[background,color,box-shadow] duration-[160ms]',
          modelValue === section.value
            ? 'bg-pine! text-white! shadow-[0_7px_18px_rgb(21_51_38_/_16%)]'
            : 'bg-transparent! text-pine! hover:bg-porcelain!',
        ]"
        variant="unstyled"
        :aria-controls="`settings-${section.value}-panel`"
        :aria-pressed="modelValue === section.value"
        @click="emit('update:modelValue', section.value)"
      >
        <span>{{ section.label }}</span>
      </AppButton>
    </div>
  </PanelCard>
</template>
