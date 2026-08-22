<script setup lang="ts">
import { onBeforeUnmount, onMounted, shallowRef, useTemplateRef } from "vue";

import AppButton from "@/components/ui/AppButton.vue";

defineProps<{ resetting: boolean }>();
const emit = defineEmits<{ reset: [] }>();

const open = shallowRef(false);
const root = useTemplateRef<HTMLElement>("root");
const trigger = useTemplateRef<HTMLButtonElement>("trigger");

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

onMounted(() => document.addEventListener("pointerdown", closeOnOutsidePointer));
onBeforeUnmount(() => document.removeEventListener("pointerdown", closeOnOutsidePointer));
</script>

<template>
  <div ref="root" class="relative flex-none" @keydown.esc.stop="closeAndFocusTrigger">
    <button
      ref="trigger"
      type="button"
      class="grid h-9 w-9 cursor-pointer place-items-center rounded-full border-0 bg-transparent text-lg leading-none text-white/58 hover:bg-white/8 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-belt-light"
      aria-label="Video actions"
      aria-haspopup="menu"
      :aria-expanded="open"
      @click="open = !open"
    >
      <span aria-hidden="true">•••</span>
    </button>

    <div
      v-if="open"
      role="menu"
      aria-label="Video actions"
      class="absolute right-0 z-20 mt-2 min-w-44 rounded-[7px] border border-white/12 bg-[#1b231f] p-1"
    >
      <AppButton
        variant="unstyled"
        role="menuitem"
        class="flex w-full items-center gap-2 rounded-[5px] px-3 py-2 text-left text-sm text-white/78 hover:bg-white/8 focus-visible:bg-white/8 focus-visible:outline-none"
        :loading="resetting"
        loading-label="Resetting…"
        @click="resetProgress"
        >Reset progress</AppButton
      >
    </div>
  </div>
</template>
