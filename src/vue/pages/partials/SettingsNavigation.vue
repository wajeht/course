<script setup lang="ts">
import AppButton from "@/components/ui/AppButton.vue";
import PanelCard from "@/components/ui/PanelCard.vue";

export type SettingsSection = "auth" | "data";

const sections: ReadonlyArray<{ label: string; value: SettingsSection }> = [
  { label: "Data", value: "data" },
  { label: "Auth", value: "auth" },
];

defineProps<{
  modelValue: SettingsSection;
  signingOut?: boolean;
}>();

const emit = defineEmits<{
  "update:modelValue": [section: SettingsSection];
  signOut: [];
}>();
</script>

<template>
  <PanelCard as="nav" class="p-2" padding="none" aria-label="Settings sections">
    <div class="grid gap-1 max-[760px]:grid-cols-2" role="tablist">
      <AppButton
        v-for="section in sections"
        :id="`settings-${section.value}-tab`"
        :key="section.value"
        :class="[
          'flex min-h-11 w-full justify-start rounded-[7px] px-[18px] text-left text-[.82rem] font-[750]',
          modelValue === section.value ? '' : 'text-pine! hover:bg-porcelain!',
        ]"
        size="lg"
        :variant="modelValue === section.value ? 'primary' : 'unstyled'"
        role="tab"
        :aria-controls="`settings-${section.value}-panel`"
        :aria-selected="modelValue === section.value"
        @click="emit('update:modelValue', section.value)"
      >
        {{ section.label }}
      </AppButton>
    </div>
    <div class="mt-2 border-t border-line pt-2">
      <AppButton
        class="flex min-h-11 w-full justify-start rounded-[7px] px-[18px] text-left text-[.8rem] font-semibold text-clay! hover:bg-[#fff3f0]! hover:text-[#873a31]!"
        variant="unstyled"
        :loading="signingOut"
        loading-label="Signing out…"
        @click="emit('signOut')"
      >
        Sign out
      </AppButton>
    </div>
  </PanelCard>
</template>
