import { onBeforeUnmount, onMounted, readonly, ref } from "vue";

export function useNetworkStatus() {
  const online = ref(typeof navigator === "undefined" || navigator.onLine);

  function update(): void {
    online.value = navigator.onLine;
  }

  onMounted(() => {
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
  });
  onBeforeUnmount(() => {
    window.removeEventListener("online", update);
    window.removeEventListener("offline", update);
  });

  return { online: readonly(online) };
}
