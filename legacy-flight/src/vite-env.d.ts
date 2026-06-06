/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Vapi PUBLIC (browser-safe) key. Optional — the page input field can supply it. */
  readonly VITE_VAPI_PUBLIC_KEY?: string;
  /** Optional real phone number (E.164) people can dial to reach the agent. */
  readonly VITE_VAPI_PHONE_NUMBER?: string;
  /** Public URL of the search_flights backend, e.g. https://abc.ngrok.app/search-flights. */
  readonly VITE_SEARCH_FLIGHTS_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
