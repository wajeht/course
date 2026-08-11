/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/vue" />

declare module "*.vue" {
  import type { DefineComponent } from "vue";

  const component: DefineComponent<Record<string, never>, Record<string, never>, unknown>;
  export default component;
}

declare module "hls.js/light" {
  import Hls from "hls.js";

  export default Hls;
}
