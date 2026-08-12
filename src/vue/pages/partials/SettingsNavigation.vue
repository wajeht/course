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
          'flex min-h-12 w-full items-center gap-3 rounded-[7px] px-3.5 text-left text-[.82rem] font-bold transition-[background,color,box-shadow] duration-[160ms]',
          modelValue === section.value
            ? 'bg-pine! text-white! shadow-[0_7px_18px_rgb(21_51_38_/_16%)]'
            : 'bg-transparent! text-pine! hover:bg-porcelain!',
        ]"
        variant="unstyled"
        role="tab"
        :aria-controls="`settings-${section.value}-panel`"
        :aria-selected="modelValue === section.value"
        @click="emit('update:modelValue', section.value)"
      >
        <span
          :class="[
            'grid h-8 w-8 flex-none place-items-center rounded-[6px] transition-colors duration-[160ms]',
            modelValue === section.value ? 'bg-white/12 text-belt-light' : 'bg-porcelain text-pine',
          ]"
          aria-hidden="true"
        >
          <svg
            v-if="section.value === 'data'"
            class="h-[17px] w-[17px] fill-none stroke-current stroke-[1.7]"
            viewBox="0 0 24 24"
          >
            <ellipse cx="12" cy="5" rx="7" ry="3" />
            <path d="M5 5v7c0 1.7 3.1 3 7 3s7-1.3 7-3V5M5 12v7c0 1.7 3.1 3 7 3s7-1.3 7-3v-7" />
          </svg>
          <svg
            v-else
            class="h-[17px] w-[17px] fill-none stroke-current stroke-[1.7]"
            viewBox="0 0 24 24"
          >
            <rect x="5" y="10" width="14" height="10" rx="2" />
            <path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v2" />
          </svg>
        </span>
        <span>{{ section.label }}</span>
        <span
          v-if="modelValue === section.value"
          class="ml-auto h-2 w-2 rounded-full bg-belt-light"
          aria-hidden="true"
        />
      </AppButton>
    </div>
    <div class="mt-2 border-t border-line pt-2">
      <AppButton
        class="flex min-h-11 w-full items-center gap-3 rounded-[7px] px-3.5 text-left text-[.8rem] font-semibold text-clay! transition-colors duration-[160ms] hover:bg-[#fff3f0]! hover:text-[#873a31]!"
        variant="unstyled"
        :loading="signingOut"
        loading-label="Signing out…"
        @click="emit('signOut')"
      >
        <span
          class="grid h-8 w-8 flex-none place-items-center rounded-[6px] bg-[#fff3f0]"
          aria-hidden="true"
        >
          <svg class="h-[17px] w-[17px] fill-none stroke-current stroke-[1.7]" viewBox="0 0 24 24">
            <path d="M10 5H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h4M14 8l4 4-4 4M9 12h9" />
          </svg>
        </span>
        <span>Sign out</span>
      </AppButton>
    </div>
  </PanelCard>
</template>
