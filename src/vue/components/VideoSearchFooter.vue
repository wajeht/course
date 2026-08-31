<script setup lang="ts">
defineProps<{
  hasQuery: boolean;
  selected: boolean;
}>();
</script>

<template>
  <footer
    class="flex items-center gap-5 border-t border-line px-5 py-3 text-[.68rem] text-muted max-[600px]:hidden"
  >
    <span><kbd class="font-mono">↑↓</kbd> Navigate</span>
    <span v-if="hasQuery">
      <kbd class="font-mono">Enter</kbd>
      {{ selected ? "Open" : "View all results" }}
    </span>
    <span v-else>Type 2+ characters to search</span>
    <span class="ml-auto"><kbd class="font-mono">Esc</kbd> Close</span>
  </footer>
</template>
