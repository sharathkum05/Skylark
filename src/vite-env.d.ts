/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Vapi PUBLIC (browser-safe) key. Optional — the page input field can supply it. */
  readonly VITE_VAPI_PUBLIC_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
