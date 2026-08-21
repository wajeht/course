export function useIntentPrefetch(action: () => void) {
  return { run: action };
}
