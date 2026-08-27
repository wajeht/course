<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, shallowRef, useTemplateRef } from "vue";

import AppButton from "@/components/ui/AppButton.vue";

const props = withDefaults(
  defineProps<{
    label: string;
    resetLabel: string;
    resetting: boolean;
    regenerateLabel?: string;
    regenerating?: boolean;
    tone?: "dark" | "light";
  }>(),
  { tone: "dark", regenerating: false },
);
const emit = defineEmits<{ reset: []; regenerate: [] }>();

const open = shallowRef(false);
const root = useTemplateRef<HTMLElement>("root");
const trigger = useTemplateRef<HTMLButtonElement>("trigger");
const triggerClasses = computed(() =>
  props.tone === "light"
    ? "text-pine/58 hover:bg-pine/8 hover:text-pine focus-visible:outline-pine"
    : "text-white/58 hover:bg-white/8 hover:text-white focus-visible:outline-belt-light",
);
const panelClasses = computed(() =>
  props.tone === "light" ? "border-line bg-white" : "border-white/12 bg-[#1b231f]",
);
const itemClasses = computed(() =>
  props.tone === "light"
    ? "text-pine hover:bg-pine/8 focus-visible:bg-pine/8"
    : "text-white/78 hover:bg-white/8 focus-visible:bg-white/8",
);

function close(): void {
  open.value = false;
}

function closeAndFocusTrigger(): void {
  close();
  trigger.value?.focus();
}

function closeOnOutsidePointer(event: PointerEvent): void {
  const target = event.target;

  if (target instanceof Node && !root.value?.contains(target)) {
    close();
  }
}

function resetProgress(): void {
  close();
  emit("reset");
}

function regenerateThumbnail(): void {
  close();
  emit("regenerate");
}

onMounted(() => document.addEventListener("pointerdown", closeOnOutsidePointer));
onBeforeUnmount(() => document.removeEventListener("pointerdown", closeOnOutsidePointer));
</script>

<template>
  <div ref="root" class="relative flex-none" @keydown.esc.stop="closeAndFocusTrigger">
    <button
      ref="trigger"
      type="button"
      class="grid h-9 w-9 cursor-pointer place-items-center rounded-full border-0 bg-transparent text-lg leading-none focus-visible:outline-2 focus-visible:outline-offset-2"
      :class="triggerClasses"
      :aria-label="label"
      aria-haspopup="menu"
      :aria-expanded="open"
      @click="open = !open"
    >
      <span class="flex flex-col items-center gap-0.5" aria-hidden="true">
        <span class="player-progress-menu-dot h-1 w-1 rounded-full bg-current" />
        <span class="player-progress-menu-dot h-1 w-1 rounded-full bg-current" />
        <span class="player-progress-menu-dot h-1 w-1 rounded-full bg-current" />
      </span>
    </button>

    <div
      v-if="open"
      role="menu"
      :aria-label="label"
      class="absolute right-0 z-20 mt-2 min-w-44 rounded-[7px] border p-1"
      :class="panelClasses"
    >
      <AppButton
        v-if="regenerateLabel"
        variant="unstyled"
        role="menuitem"
        class="flex w-full items-center gap-2 rounded-[5px] px-3 py-2 text-left text-sm focus-visible:outline-none"
        :class="itemClasses"
        :loading="regenerating"
        loading-label="Updating…"
        @click="regenerateThumbnail"
        >{{ regenerateLabel }}</AppButton
      >
      <AppButton
        variant="unstyled"
        role="menuitem"
        class="flex w-full items-center gap-2 rounded-[5px] px-3 py-2 text-left text-sm focus-visible:outline-none"
        :class="itemClasses"
        :loading="resetting"
        loading-label="Resetting…"
        @click="resetProgress"
        >{{ resetLabel }}</AppButton
      >
    </div>
  </div>
</template>
