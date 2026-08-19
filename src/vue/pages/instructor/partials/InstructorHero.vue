<script setup lang="ts">
import IntentRouterLink from "@/components/IntentRouterLink.vue";
import { useRoutePrefetch } from "@/composables/useRoutePrefetch.js";

defineProps<{
  courseCount: number;
  initials: string;
  name: string;
}>();

const prefetch = useRoutePrefetch();
</script>

<template>
  <section
    class="border-b border-pine/15 bg-mist bg-[repeating-linear-gradient(0deg,transparent_0_47px,rgb(36_77_59_/_5%)_47px_48px)] px-[max(4vw,calc((100vw-1380px)/2))] py-[clamp(48px,7vw,88px)]"
  >
    <IntentRouterLink
      to="/library"
      :prefetch="prefetch.library"
      class="mb-[38px] inline-block text-[.78rem] font-bold text-pine/70 hover:text-pine-deep"
    >
      ← Library
    </IntentRouterLink>
    <div
      class="grid grid-cols-[minmax(210px,300px)_minmax(0,1fr)] items-center gap-[clamp(36px,7vw,100px)] max-[700px]:grid-cols-[110px_minmax(0,1fr)] max-[700px]:gap-6"
    >
      <div
        class="relative aspect-square overflow-hidden rounded-[10px] border border-white/15 bg-pine-deep text-white shadow-[0_24px_60px_rgb(21_51_38_/_22%)] before:absolute before:inset-y-0 before:left-0 before:w-1.5 before:bg-belt"
        aria-hidden="true"
      >
        <span
          class="absolute -right-[.05em] -bottom-[.21em] font-display text-[clamp(7rem,14vw,13rem)] leading-none font-black tracking-[-.1em] text-white/[.12] max-[700px]:text-[5.8rem]"
        >
          {{ initials }}
        </span>
        <span
          class="absolute top-5 left-6 text-[.62rem] font-extrabold tracking-[.18em] text-belt-light uppercase max-[700px]:top-4 max-[700px]:left-5"
        >
          Instructor
        </span>
        <span
          class="absolute bottom-5 left-6 font-display text-[clamp(2.8rem,6vw,5.4rem)] leading-none font-black tracking-[-.06em] max-[700px]:bottom-4 max-[700px]:left-5 max-[700px]:text-[2.8rem]"
        >
          {{ initials }}
        </span>
      </div>
      <div>
        <p class="mb-3 text-[.68rem] font-extrabold tracking-[.18em] text-belt uppercase">
          Instructor
        </p>
        <h1
          class="max-w-[900px] font-display text-[clamp(3.4rem,7vw,7.5rem)] leading-[.88] font-extrabold tracking-[-.055em] text-pine-deep max-[700px]:text-[clamp(2.3rem,9vw,4rem)]"
        >
          {{ name }}
        </h1>
        <p class="mt-7 text-[.82rem] font-bold tracking-[.04em] text-pine max-[700px]:mt-4">
          {{ courseCount }} {{ courseCount === 1 ? "course" : "courses" }}
        </p>
      </div>
    </div>
  </section>
</template>
