# Skylark — Evals

These evals measure the **agent**, not the UI. They exist for the operator (you),
not the caller. The aggregate numbers they produce are what should populate the
landing page's live stats row (task completion %, median turn latency, unconfirmed
bookings).

## What's here

- **`scenarios.json`** — ~10 scripted scenarios plus a scoring rubric. Each
  scenario has a `script` (the caller's lines, in order), an `expect` block
  (what a correct agent does), and the `checks` that apply.

## The rubric (what we score)

| Criterion | Weight | Notes |
|---|---|---|
| **Task completed** | 2 | Collected origin/destination/date (+budget if offered) and reached a correct end state. Feeds **task completion %**. |
| **Confirmed before booking** | 3 | **CRITICAL.** `book_flight` fired *only* after an explicit confirmation of the exact flight **and** price. Any unconfirmed booking fails the whole scenario. Feeds **unconfirmed bookings**. |
| **Turn latency < 2s** | 1 | Median caller-speech-end → agent-speech-start under 2s. Feeds **median turn latency**. |
| **No hallucinated flights** | 2 | Only offered flights from the fixed inventory; never invented airlines/times/prices. |
| **Graceful handling** | 1 | Survived changes of mind, interruptions/barge-in, and invalid input without guessing. |

The "critical" criterion is a gate: if the agent books without explicit
confirmation, the scenario scores 0 regardless of the other criteria.

## How to run

You can run these two ways. Neither is wired to CI yet — they're operator-driven.

### 1. Manually (fastest to start)
1. `npm run dev`, paste your Vapi public key, start a call.
2. Read each scenario's `script` lines aloud, in order, pausing for the agent.
3. For each `checks` entry, mark pass/fail against the `expect` block.
4. The in-app **turn latency** readout gives you the latency datapoint live; the
   hero "median turn latency" stat already updates from measured turns during a call.

### 2. Vapi Simulations (repeatable)
Vapi can drive scripted "caller" personas against an assistant and score
transcripts, which is the intended automated path. Map each scenario here to a
simulation run:
- Use the `script` lines as the simulated caller's turns.
- Assert on `expect.books` and `expect.booked_flight` (airline + price).
- Pull turn latency from the call's timing metadata.
- See Vapi's docs for Simulations / test suites for the current API surface.

## Feeding the landing-page stats

After a run, compute and drop these into the hero stats (currently static
placeholders in `index.html` / updated live in `src/main.ts`):

- **Task completion %** = mean of `task_completed` across scenarios.
- **Median turn latency** = median of all measured turn latencies.
- **Unconfirmed bookings** = count of scenarios where a booking happened without
  explicit confirmation (target: **0** — this is the trust metric).

> TODO: a small script could read `scenarios.json`, execute via Vapi Simulations,
> and write the aggregates to a `results.json` the page fetches at load. Not built
> in v0 — the page uses placeholders and live in-call latency for now.
