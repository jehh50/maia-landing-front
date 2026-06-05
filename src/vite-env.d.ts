/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module 'vanta/dist/vanta.net.min' {
  import * as THREE from 'three';
  interface VantaNetOptions {
    el: HTMLElement | null;
    THREE: typeof THREE;
    color?: number;
    backgroundColor?: number;
    points?: number;
    maxDistance?: number;
    spacing?: number;
    showDots?: boolean;
    [key: string]: unknown;
  }
  interface VantaEffect {
    destroy: () => void;
  }
  function NET(options: VantaNetOptions): VantaEffect;
  export default NET;
}
