<script setup lang="ts">
import { computed, ref } from "vue";

defineOptions({ inheritAttrs: false });

const props = withDefaults(
  defineProps<{
    disabled?: boolean;
    invalid?: boolean;
    revealable?: boolean;
    type?: string;
    variant?: "bare" | "dark" | "default";
  }>(),
  {
    disabled: false,
    invalid: false,
    revealable: true,
    type: "text",
    variant: "default",
  },
);

const model = defineModel<string>({ default: "" });
const input = ref<HTMLInputElement | null>(null);
const revealed = ref(false);
const actualType = computed(() =>
  props.type === "password" && revealed.value ? "text" : props.type,
);
const canReveal = computed(() => props.type === "password" && props.revealable);
const inputClasses = computed(
  () =>
    ({
      bare: "border-0 bg-transparent p-0 text-ink outline-0 placeholder:text-[#89918d]",
      dark: "border-white/16 bg-[#202824] text-white placeholder:text-white/40 focus:border-belt-light",
      default: "border-line bg-white text-ink placeholder:text-[#89918d] focus:border-pine",
    })[props.variant],
);

defineExpose({
  blur: () => input.value?.blur(),
  focus: () => input.value?.focus(),
  input,
});
</script>

<template>
  <div class="relative w-full">
    <input
      ref="input"
      v-model="model"
      v-bind="$attrs"
      :type="actualType"
      :disabled="disabled"
      :aria-invalid="invalid ? 'true' : undefined"
      :class="[
        'w-full min-w-0 outline-none disabled:cursor-not-allowed disabled:opacity-55',
        variant === 'bare' ? '' : 'min-h-10 rounded-[7px] border px-3 text-sm',
        canReveal ? 'pr-12' : '',
        invalid ? 'border-clay focus:border-clay' : '',
        inputClasses,
      ]"
    />
    <button
      v-if="canReveal"
      class="absolute inset-y-0 right-0 grid w-11 cursor-pointer place-items-center border-0 bg-transparent text-[.7rem] font-bold text-pine"
      type="button"
      :aria-label="revealed ? 'Hide password' : 'Show password'"
      @click="revealed = !revealed"
    >
      {{ revealed ? "Hide" : "Show" }}
    </button>
  </div>
</template>
