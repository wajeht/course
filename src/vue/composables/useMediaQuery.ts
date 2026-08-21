import { onMounted, onScopeDispose, shallowRef } from "vue";

export function useMediaQuery(query: string) {
  const matches = shallowRef(false);
  let mediaQuery: MediaQueryList | undefined;

  function update(): void {
    matches.value = mediaQuery?.matches ?? false;
  }

  onMounted(() => {
    mediaQuery = window.matchMedia(query);
    update();
    mediaQuery.addEventListener("change", update);
  });

  onScopeDispose(() => mediaQuery?.removeEventListener("change", update));

  return matches;
}
