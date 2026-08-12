<script setup lang="ts">
import AppButton from "@/components/ui/AppButton.vue";

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
  <nav aria-label="Settings sections">
    <div class="grid gap-2 max-[760px]:grid-cols-2" role="tablist" aria-orientation="vertical">
      <AppButton
        v-for="section in sections"
        :id="`settings-${section.value}-tab`"
        :key="section.value"
        class="w-full justify-start px-4 text-left max-[760px]:text-center"
        :variant="modelValue === section.value ? 'secondary' : 'unstyled'"
        role="tab"
        :aria-controls="`settings-${section.value}-panel`"
        :aria-selected="modelValue === section.value"
        @click="emit('update:modelValue', section.value)"
      >
        {{ section.label }}
      </AppButton>
    </div>
    <AppButton
      class="mt-3 w-full justify-start px-4 text-left text-clay! hover:text-[#873a31]! max-[760px]:mt-2 max-[760px]:text-center"
      variant="unstyled"
      :loading="signingOut"
      loading-label="Signing out…"
      @click="emit('signOut')"
    >
      Sign out
    </AppButton>
  </nav>
</template>
