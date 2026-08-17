// @vitest-environment happy-dom

import { describe, expect, it, vi } from "vitest";

import { createPwaInstall } from "./usePwaInstall.js";

function installPrompt(outcome: "accepted" | "dismissed") {
  const event = new Event("beforeinstallprompt", { cancelable: true }) as Event & {
    prompt: ReturnType<typeof vi.fn>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  };
  event.prompt = vi.fn(async () => undefined);
  event.userChoice = Promise.resolve({ outcome, platform: "web" });
  return event;
}

describe("createPwaInstall", () => {
  it("captures and runs the browser install prompt", async () => {
    const controller = createPwaInstall(window);
    controller.initialize();
    const event = installPrompt("accepted");

    window.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(controller.state.canInstall).toBe(true);
    await expect(controller.install()).resolves.toBe(true);
    expect(event.prompt).toHaveBeenCalledOnce();
    expect(controller.state.installed).toBe(true);
    controller.dispose();
  });

  it("does not mark a dismissed prompt as installed", async () => {
    const controller = createPwaInstall(window);
    controller.initialize();
    window.dispatchEvent(installPrompt("dismissed"));

    await expect(controller.install()).resolves.toBe(false);
    expect(controller.state.installed).toBe(false);
    expect(controller.state.canInstall).toBe(false);
    controller.dispose();
  });
});
