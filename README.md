# Skylark — AI that makes your phone calls

Skylark is a Simple-AI-style assistant: you type a task ("book a table for 2 at
7pm"), and an AI **dials the business, talks to whoever answers, and reports
back**. You never pick up the phone.

Built on a Next.js landing page (rebranded from the Optimus v0 template) with a
small call-orchestration backend in Next.js API routes, powered by
[Vapi](https://vapi.ai) (telephony + STT/LLM/TTS), Deepgram, Claude, and ElevenLabs.

## How it works

```
Browser ──POST /api/tasks──> Next.js ──Vapi REST /call──> dials the business
                                 ▲                              │
                                 └──── /api/vapi-webhook ◀──────┘
            (live transcript, status, and report_result outcome stream back)
```

- **`app/api/tasks`** — create a task and place the outbound call.
- **`app/api/vapi-webhook`** — receives status / transcript / end-of-call / the
  agent's `report_result` outcome and stores it.
- **`lib/relay/assistant.ts`** — the agent's brain (prompt, model/voice, tools).
- **`lib/relay/store.ts`** — task + history persistence (`data/tasks.json`).

## Setup

1. **Install**
   ```bash
   pnpm install   # or npm install
   ```

2. **Add your Vapi private key** to `.env.local`:
   ```
   VAPI_PRIVATE_KEY=...    # dashboard.vapi.ai -> API Keys (the PRIVATE one)
   ```

3. **Mint a number to call from**
   ```bash
   npm run provision:phone
   ```
   Paste the printed `VAPI_PHONE_NUMBER_ID=...` into `.env.local`.

4. **Expose a public webhook** so Vapi can stream events back:
   ```bash
   ngrok http 3000
   ```
   Put the https URL in `.env.local` as `PUBLIC_URL` (no trailing slash).

5. **Run**
   ```bash
   npm run dev
   ```

## Demo tip

Point a task's "number to call" at **your own phone** and role-play the business
— the AI dials you, runs the task, and you watch its report come back. No risk of
spamming a real restaurant. Live calls bill per minute on your Vapi account.

## Status

- ✅ Backend: outbound calls, webhook, structured result, history store.
- 🚧 Interactive call console UI (task composer + live transcript) — next up.
- The original flight-booking app is archived under `legacy-flight/`.
