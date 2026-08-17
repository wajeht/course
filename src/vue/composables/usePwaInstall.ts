import { inject, reactive, readonly, type InjectionKey } from "vue";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

interface StandaloneNavigator extends Navigator {
  standalone?: boolean;
}

export interface PwaInstallController {
  dispose(): void;
  initialize(): void;
  install(): Promise<boolean>;
  state: Readonly<{
    canInstall: boolean;
    installed: boolean;
    installing: boolean;
    iosInstructions: boolean;
  }>;
}

export const pwaInstallKey: InjectionKey<PwaInstallController> = Symbol("course-pwa-install");

function installedDisplayMode(target: Window): boolean {
  return (
    target.matchMedia("(display-mode: standalone)").matches ||
    Boolean((target.navigator as StandaloneNavigator).standalone)
  );
}

function isIosBrowser(target: Window): boolean {
  return /iphone|ipad|ipod/i.test(target.navigator.userAgent);
}

export function createPwaInstall(target: Window = window): PwaInstallController {
  const state = reactive({
    canInstall: false,
    installed: installedDisplayMode(target),
    installing: false,
    iosInstructions: isIosBrowser(target) && !installedDisplayMode(target),
  });
  let deferredPrompt: BeforeInstallPromptEvent | null = null;
  let initialized = false;

  function handleInstallPrompt(event: Event): void {
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    state.canInstall = !state.installed;
  }

  function handleInstalled(): void {
    deferredPrompt = null;
    state.canInstall = false;
    state.installed = true;
    state.installing = false;
    state.iosInstructions = false;
  }

  function initialize(): void {
    if (initialized) return;
    initialized = true;
    target.addEventListener("beforeinstallprompt", handleInstallPrompt);
    target.addEventListener("appinstalled", handleInstalled);
  }

  function dispose(): void {
    if (!initialized) return;
    initialized = false;
    target.removeEventListener("beforeinstallprompt", handleInstallPrompt);
    target.removeEventListener("appinstalled", handleInstalled);
  }

  async function install(): Promise<boolean> {
    if (!deferredPrompt || state.installing || state.installed) return false;
    state.installing = true;
    const prompt = deferredPrompt;
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      deferredPrompt = null;
      state.canInstall = false;
      if (choice.outcome === "accepted") state.installed = true;
      return choice.outcome === "accepted";
    } finally {
      state.installing = false;
    }
  }

  return { dispose, initialize, install, state: readonly(state) };
}

export function usePwaInstall(): PwaInstallController {
  const install = inject(pwaInstallKey);
  if (!install) throw new Error("PWA install provider is not installed");
  return install;
}
