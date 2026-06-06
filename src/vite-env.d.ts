/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Vapi PUBLIC (browser-safe) key. Optional — the page input field can supply it. */
  readonly VITE_VAPI_PUBLIC_KEY?: string;
  /** Optional real phone number (E.164) people can dial to reach the agent. */
  readonly VITE_VAPI_PHONE_NUMBER?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
