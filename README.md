# Skylark

Voice agents that handle **inbound calls**, book reservations, and update your internal systems — no double-booking, no manual entry.

Built for businesses like restaurants and hotels. Demo business: **The Copper Table**.

## Demo

<!-- Replace VIDEO_ID below with your YouTube video ID (unlisted is fine) -->

[![Watch the Skylark demo](https://img.youtube.com/vi/VIDEO_ID/0.jpg)](https://youtu.be/VIDEO_ID)

**[Watch demo →](https://youtu.be/VIDEO_ID)**

Call the live inbound agent (when configured): number shown on the [landing page](http://localhost:3000) hero.

**Owner dashboard (local):** [http://localhost:3000/dashboard](http://localhost:3000/dashboard)

---

## What it does

1. **Guest calls** your business line → Skylark answers (Vapi voice agent).
2. **Agent checks availability** → lunch slots for today via server tools.
3. **Guest confirms** name, party size, phone → booking is saved.
4. **Owner dashboard updates live** → slot flips from Open to Booked (polls every 2s).
5. **Optional:** Google Calendar event + guest confirmation (SMS or demo fallback).

```
Guest phone ──> Vapi inbound line ──> POST /api/vapi-inbound-tool
                                              │
                    ┌─────────────────────────┼─────────────────────────┐
                    ▼                         ▼                         ▼
            data/bookings.json      Google Calendar (opt)     demo SMS queue
                    │
                    ▼
            GET /api/dashboard  ──>  /dashboard (owner view)
```

---

## Stack

| Layer | Tech |
|-------|------|
| Web | Next.js 16, React, Tailwind |
| Voice | [Vapi](https://vapi.ai) (STT / LLM / TTS / telephony) |
| Booking tools | Next.js API routes + local JSON ledger |
| Calendar | Google Calendar API (optional) |
| SMS | Twilio (optional; US carrier registration required for delivery) |

---

## Quick start (local demo)

### 1. Install

```bash
pnpm install   # or npm install
cp .env.example .env.local
```

### 2. Configure `.env.local`

Minimum for inbound booking:

| Variable | Description |
|----------|-------------|
| `VAPI_PRIVATE_KEY` | Vapi private API key |
| `VAPI_INBOUND_ASSISTANT_ID` | Assistant attached to your inbound number |
| `NEXT_PUBLIC_SKYLARK_DEMO_NUMBER` | Display + link on landing page |
| `PUBLIC_URL` | Public https URL (ngrok in dev) |

See `.env.example` for Google Calendar and Twilio (optional).

**Never commit `.env.local`** — it is git-ignored.

### 3. Expose localhost (required for live calls)

Vapi must reach your tool endpoints during a call:

```bash
ngrok http 3000
```

Set `PUBLIC_URL` in `.env.local` to the ngrok `https://` URL, then sync the assistant:

```bash
npm run update:inbound
```

Re-run `update:inbound` whenever `PUBLIC_URL` changes.

### 4. Run

```bash
npm run dev
```

- Landing: [http://localhost:3000](http://localhost:3000)
- Owner dashboard: [http://localhost:3000/dashboard](http://localhost:3000/dashboard)

### 5. Google Calendar (optional, one-time)

Visit [http://localhost:3000/api/auth/google](http://localhost:3000/api/auth/google), complete OAuth, then copy the refresh token into `.env.local`.

---

## Demo lunch slots

Configured in `lib/booking/config.ts` for **The Copper Table**:

| Time |
|------|
| 1:00 PM |
| 1:30 PM |
| 2:00 PM |
| 3:00 PM |
| 3:30 PM |
| 4:00 PM |

---

## Project layout

```
app/
  api/vapi-inbound-tool/   # Vapi server tools (check_availability, book_slot)
  api/dashboard/           # Live board JSON for owner UI
  dashboard/               # Owner reservation dashboard
  demo/confirmations/      # Demo guest SMS feed
lib/
  booking/                 # Slots, store, dashboard board
  inbound/                 # Assistant prompt + tool definitions
  calendar/                # Google Calendar sync
  sms/                     # Twilio + demo confirmation fallback
scripts/
  update-inbound-assistant.mjs
data/                      # Runtime bookings (git-ignored)
legacy-flight/             # Archived earlier flight-booking prototype
```

---

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Production build |
| `npm run update:inbound` | Push prompt + tools to Vapi assistant |
| `npm run provision:demo` | Create demo assistant + number (Vapi API) |

---

## SMS note (US)

Twilio local numbers require **A2P 10DLC** or **toll-free verification** before texts deliver to real phones. For demos:

- Use the **owner dashboard** guest confirmations panel, or
- Twilio **Virtual Phone** in the API Explorer

Set `DEMO_SMS_FALLBACK=true` (default) to queue confirmation copy without carrier delivery.

---

## Security (public repo)

- `.env*` files are **git-ignored** — use `.env.example` as a template only.
- `/data` runtime JSON is **git-ignored**.
- Do not paste API keys, tokens, or refresh tokens into issues or PRs.
- Rotate keys if they were ever exposed.

---

## Status

- ✅ Inbound voice agent + booking tools
- ✅ Live owner dashboard
- ✅ Google Calendar sync (optional)
- ✅ Demo confirmation fallback (SMS blocked on trial / unregistered numbers)
- 🚧 Production deploy + persistent database (bookings currently use local JSON)
- 📦 Outbound call flow + `legacy-flight/` archived prototype

---

## License

Private / all rights reserved unless otherwise noted.
