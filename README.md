# Skylark — book a flight by voice

A one-page web demo where you tap a button, talk to an AI gate agent, and book a
flight in a single short conversation. **The landing page _is_ the live demo.**

It uses [Vapi](https://vapi.ai)'s Web SDK to run the listen → think → speak loop
in the browser with an **inline (ephemeral) assistant**, so there's no dashboard
setup and no backend required for v0.

- **Transcriber:** Deepgram `nova-2`
- **Model:** OpenAI `gpt-4o` _(swappable to Claude in one place — see below)_
- **Voice:** ElevenLabs
- **Tool:** `book_flight` as a **client-side** tool → the browser renders a
  boarding-pass ticket when the agent books.

## Run it

You only need a Vapi **public** key (browser-safe).

```bash
npm install
npm run dev
```

Then open the local URL Vite prints, **paste your Vapi public key** into the
field on the page, and press **Start call**. Allow microphone access when asked,
and say where you'd like to fly.

### Getting a key

1. Go to **https://dashboard.vapi.ai → API Keys**.
2. Copy the **Public Key** (not the private key).
3. Either paste it into the page, **or** put it in a `.env` file:

```bash
cp .env.example .env
# then edit .env:
# VITE_VAPI_PUBLIC_KEY=pk_your_public_key
```

The page field takes precedence over the env var, so you can demo a different key
without rebuilding.

> Note: ElevenLabs voice and the OpenAI model are billed through your Vapi
> account's provider config. The public key only authorizes starting web calls.

## How it works

- **`src/assistant.ts`** — the agent's whole brain in one editable file: system
  prompt, the fixed mock flight list, provider config, the `book_flight` tool
  schema, and the assembled inline assistant. **Swap the model to Claude here** by
  editing `MODEL_CONFIG` (e.g. `{ provider: "anthropic", model: "claude-sonnet-4-6" }`).
- **`src/main.ts`** — Vapi wiring + UI: resolves the key, manages the call,
  renders live (partial → final) transcripts, measures turn latency
  (caller speech-end → agent speech-start), handles the `book_flight` tool-call by
  rendering the ticket, and shows mic/connection errors in a banner.
- **`src/style.css`** — the departure-board theme (amber on near-black, film
  grain, split-flap accents; Bricolage Grotesque + JetBrains Mono).

### The agent's rules

Warm, one question at a time, 1–2 sentences per turn. Collects origin →
destination → date → (optional) budget, then offers **only** from the fixed list:

```
SkyHop  8:00 AM  $180  nonstop
SkyHop  2:00 PM  $150  1-stop
NightJet 9:00 PM $240  nonstop
```

It **never books** until you explicitly confirm the exact flight **and** price,
and it **never invents** flights outside that list.

## Mock data, client vs. server tools

`book_flight` is a **client-side** tool: it has no server URL, so Vapi emits a
`tool-calls` message the browser handles (rendering the ticket). That's the right
shape for a local UI action.

A real **`search_flights`** (returning live fares the model reasons over) must be
a **server-side** tool, because its results have to flow back into the model's
context. That's intentionally **not built in v0** — there's a clear `TODO` in
`src/assistant.ts` marking where it goes.

## Evals

See [`evals/`](evals/) — ~10 scripted scenarios and a scoring rubric (task
completed, **confirmed-before-booking** as the critical gate, turn latency < 2s,
no hallucinated flights, graceful handling of changes/interruptions/invalid
input). These are run against the agent (manually or via Vapi Simulations) and
their aggregates feed the landing-page stats.

## Decisions / defaults (v0)

- **Vanilla TS + Vite** (no framework) — keeps it a tiny static, deployable
  frontend.
- **Public key from page field _or_ `VITE_VAPI_PUBLIC_KEY`** — field wins; nothing
  hardcoded.
- **ElevenLabs voice id** defaults to `burt`; change it in `VOICE_CONFIG`.
- **Hero stats are placeholders** plus a **live** median turn-latency that updates
  during a call; the rest get wired to eval `results.json` later.
- **Seat** defaults to `economy` unless the caller asks otherwise.
- No real tickets are issued — the inventory is mock.

## Build

```bash
npm run build    # type-checks then builds to dist/
npm run preview  # serve the production build
```
