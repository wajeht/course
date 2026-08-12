export const apiProxyPattern = "^/api/(auth|catalog|progress|playback|scan)(?:/|$)";

const viteApiModulePattern = /^\/api\/[^/]+\.ts$/;

export function isViteApiModulePath(requestPath: string): boolean {
  return viteApiModulePattern.test(requestPath);
}
