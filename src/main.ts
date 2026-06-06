/**
 * main.ts — Skylark UI + Vapi wiring (dial-pad edition)
 * ------------------------------------------------------------------
 * Owns the call lifecycle and the DOM:
 *   - resolve the public key (input field first, then VITE_VAPI_PUBLIC_KEY)
 *   - drive the on-screen phone: dial-pad keys (with DTMF tones), call timer,
 *     live waveform, Call / End / Mute
 *   - render live (partial -> final) transcripts
 *   - measure turn latency (user final transcript -> assistant speech-start)
 *   - handle the client-side `book_flight` tool-call by rendering a ticket
 *   - surface mic-permission / connection errors in a visible banner
 *
 * The dial pad is the call's "front door": pressing Call starts an in-browser
 * web call to the agent (no real phone number is dialed — there's one agent).
 */

import Vapi from "@vapi-ai/web";
import "./style.css";
import { buildAssistant, type BookFlightArgs } from "./assistant";

/* ---------------------------- DOM refs ---------------------------- */
const $ = <T extends HTMLElement = HTMLElement>(id: string): T => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing #${id} in DOM`);
  return el as T;
};

const keyInput = $<HTMLInputElement>("key-input");
const callBtn = $<HTMLButtonElement>("call-btn");
const callBtnLabel = $("call-btn-label");
const muteBtn = $<HTMLButtonElement>("mute-btn");
const statusEl = $("status");
const statusLabel = $("status-label");
const banner = $("banner");
const transcriptEl = $("transcript");
const transcriptEmpty = $("transcript-empty");
const ticketSlot = $("ticket-slot");
const latencyValue = $("latency-value");
const wave = $("wave");
const dialpad = $("dialpad");
const dialDisplay = $("dial-display");
const callTimer = $("call-timer");
const statLatency = $("stat-latency");
const statUnconfirmed = $("stat-unconfirmed");

/* ---------------------------- State ------------------------------ */
let vapi: Vapi | null = null;
let isLive = false;
let isMuted = false;
let userSpeechEndAt: number | null = null;
const latencies: number[] = [];
const livePartial: Partial<Record<"user" | "assistant", HTMLElement>> = {};

/* ----------------------- Waveform setup ------------------------- */
const WAVE_BARS = 18;
for (let i = 0; i < WAVE_BARS; i++) wave.appendChild(document.createElement("i"));
const waveEls = Array.from(wave.children) as HTMLElement[];

function renderWave(level: number) {
  // Symmetric "voice" shape: peak in the middle, scaled by output volume.
  const mid = (WAVE_BARS - 1) / 2;
  waveEls.forEach((bar, i) => {
    const dist = 1 - Math.abs(i - mid) / mid; // 0..1, 1 at centre
    const h = 4 + level * dist * 24;
    bar.style.height = `${h}px`;
    bar.classList.toggle("on", level > 0.04 && h > 6);
  });
}
function resetWave() {
  waveEls.forEach((bar) => {
    bar.classList.remove("on");
    bar.style.height = "4px";
  });
}
resetWave();

/* -------------------------- DTMF tones -------------------------- */
// Lazily created on first key press (an AudioContext needs a user gesture).
let audioCtx: AudioContext | null = null;
const DTMF: Record<string, [number, number]> = {
  "1": [697, 1209], "2": [697, 1336], "3": [697, 1477],
  "4": [770, 1209], "5": [770, 1336], "6": [770, 1477],
  "7": [852, 1209], "8": [852, 1336], "9": [852, 1477],
  "*": [941, 1209], "0": [941, 1336], "#": [941, 1477],
};
function playTone(key: string) {
  const pair = DTMF[key];
  if (!pair) return;
  try {
    audioCtx ??= new (window.AudioContext ||
      (window as any).webkitAudioContext)();
    const ctx = audioCtx;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.16);
    gain.connect(ctx.destination);
    for (const f of pair) {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = f;
      osc.connect(gain);
      osc.start();
      osc.stop(ctx.currentTime + 0.17);
    }
  } catch {
    /* audio is a nicety; never let it break the call */
  }
}

/* ----------------------- Dial-pad display ----------------------- */
let dialed = ""; // what the user has typed; cosmetic (one agent to call)
const DIAL_PLACEHOLDER = "1‑800‑SKYLARK";
function refreshDial() {
  dialDisplay.textContent = dialed || DIAL_PLACEHOLDER;
}
function pressKey(key: string) {
  if (key === "back") {
    dialed = dialed.slice(0, -1);
  } else {
    if (dialed.length < 18) dialed += key;
    playTone(key);
  }
  refreshDial();
}

dialpad.addEventListener("click", (e) => {
  const btn = (e.target as HTMLElement).closest<HTMLElement>(".key");
  if (!btn) return;
  const key = btn.dataset.key;
  if (!key) return;
  btn.classList.add("pressed");
  setTimeout(() => btn.classList.remove("pressed"), 120);
  pressKey(key);
});

/* --------------------------- Call timer ------------------------- */
let timerStart = 0;
let timerHandle: number | null = null;
function fmt(ms: number) {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}
function startTimer() {
  timerStart = performance.now();
  callTimer.textContent = "00:00";
  timerHandle = window.setInterval(() => {
    callTimer.textContent = fmt(performance.now() - timerStart);
  }, 500);
}
function stopTimer() {
  if (timerHandle != null) clearInterval(timerHandle);
  timerHandle = null;
}

/* --------------------------- Banner ----------------------------- */
function showBanner(message: string, kind: "error" | "info" = "error") {
  banner.textContent = message;
  banner.className = `banner is-${kind}`;
  banner.hidden = false;
}
function clearBanner() {
  banner.hidden = true;
}

/* --------------------------- Status ----------------------------- */
type StatusState = "idle" | "connecting" | "live" | "error";
function setStatus(state: StatusState, label?: string) {
  statusEl.className = `status is-${state}`;
  statusLabel.textContent =
    label ??
    { idle: "Ready", connecting: "Dialing", live: "On call", error: "Error" }[
      state
    ];
}

/* --------------------------- Transcript -------------------------- */
function ensureTranscriptScrolled() {
  transcriptEl.scrollTop = transcriptEl.scrollHeight;
}
function renderTranscript(
  role: "user" | "assistant",
  text: string,
  final: boolean,
) {
  transcriptEmpty.hidden = true;
  let el = livePartial[role];
  if (!el) {
    el = document.createElement("div");
    el.className = `turn ${role} partial`;
    el.innerHTML = `<span class="turn-role">${
      role === "user" ? "You" : "Skylark"
    }</span><span class="turn-text"></span>`;
    transcriptEl.appendChild(el);
    livePartial[role] = el;
  }
  (el.querySelector(".turn-text") as HTMLElement).textContent = text;
  if (final) {
    el.classList.remove("partial");
    delete livePartial[role];
  }
  ensureTranscriptScrolled();
}

/* --------------------------- Latency ----------------------------- */
function median(nums: number[]): number {
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}
function recordTurnLatency() {
  if (userSpeechEndAt == null) return;
  const ms = performance.now() - userSpeechEndAt;
  userSpeechEndAt = null;
  if (ms < 100 || ms > 15000) return; // ignore implausible gaps
  latencies.push(ms);
  latencyValue.textContent = `${(ms / 1000).toFixed(2)}s`;
  const med = median(latencies) / 1000;
  statLatency.innerHTML = `${med.toFixed(1)}<span class="unit">s</span>`;
}

/* --------------------- book_flight -> ticket --------------------- */
function cityCode(name: string): string {
  const cleaned = (name || "").replace(/[^a-zA-Z]/g, "").toUpperCase();
  return (cleaned.slice(0, 3) || "—").padEnd(3, "X");
}
function escapeHtml(s: string): string {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function renderTicket(a: BookFlightArgs) {
  const conf = "SK" + String(1000 + (latencies.length + 7) * 37).slice(-4);
  const seat = a.seat || "economy";
  ticketSlot.innerHTML = `
    <div class="ticket" role="status" aria-label="Booking confirmation">
      <div class="ticket-head">
        <span class="t-airline">${escapeHtml(a.airline)}</span>
        <span class="t-conf">CONF ${conf}</span>
      </div>
      <div class="ticket-route">
        <div class="t-city">
          <span class="code">${cityCode(a.from)}</span>
          <span class="name">${escapeHtml(a.from)}</span>
        </div>
        <div class="t-arrow"><span>✈</span></div>
        <div class="t-city" style="text-align:right;align-items:flex-end">
          <span class="code">${cityCode(a.to)}</span>
          <span class="name">${escapeHtml(a.to)}</span>
        </div>
      </div>
      <div class="ticket-grid">
        <div class="cell"><div class="k">Date</div><div class="v">${escapeHtml(a.date)}</div></div>
        <div class="cell"><div class="k">Seat</div><div class="v">${escapeHtml(seat)}</div></div>
        <div class="cell"><div class="k">Gate</div><div class="v">B12</div></div>
      </div>
      <div class="ticket-foot">
        <span class="status-tag">CONFIRMED</span>
        <span class="price">$${Number(a.price).toFixed(0)}</span>
      </div>
    </div>`;
}

/* -------- Parse a tool-call message into book_flight args -------- */
function extractBookFlight(msg: any): BookFlightArgs | null {
  const list = msg?.toolCallList ?? msg?.toolCalls ?? msg?.tool_calls;
  if (Array.isArray(list)) {
    for (const call of list) {
      const fn = call?.function ?? call;
      if (fn?.name === "book_flight") return coerceArgs(fn.arguments);
    }
  }
  const fc = msg?.functionCall;
  if (fc?.name === "book_flight") return coerceArgs(fc.parameters ?? fc.arguments);
  return null;
}
function coerceArgs(raw: unknown): BookFlightArgs | null {
  let obj: any = raw;
  if (typeof raw === "string") {
    try { obj = JSON.parse(raw); } catch { return null; }
  }
  if (!obj || typeof obj !== "object") return null;
  return {
    airline: String(obj.airline ?? ""),
    from: String(obj.from ?? ""),
    to: String(obj.to ?? ""),
    date: String(obj.date ?? ""),
    price: Number(obj.price ?? 0),
    seat: obj.seat ? String(obj.seat) : undefined,
  };
}

/* ----------------------- Vapi event wiring ---------------------- */
function attachHandlers(v: Vapi) {
  v.on("call-start", () => {
    isLive = true;
    setStatus("live");
    callBtn.classList.add("is-active");
    callBtn.setAttribute("aria-label", "End call");
    callBtnLabel.textContent = "End call";
    muteBtn.disabled = false;
    startTimer();
    clearBanner();
  });

  v.on("call-end", () => {
    isLive = false;
    isMuted = false;
    setStatus("idle");
    callBtn.classList.remove("is-active");
    callBtn.setAttribute("aria-label", "Call");
    callBtnLabel.textContent = "Call";
    muteBtn.disabled = true;
    muteBtn.classList.remove("is-muted");
    stopTimer();
    resetWave();
    livePartial.user = undefined;
    livePartial.assistant = undefined;
  });

  // Assistant began speaking -> close the latency timer for the last user turn.
  v.on("speech-start", () => recordTurnLatency());
  v.on("speech-end", () => resetWave());
  v.on("volume-level", (level: number) => { if (isLive) renderWave(level); });

  v.on("message", (msg: any) => {
    if (msg?.type === "transcript" && typeof msg.transcript === "string") {
      const role = msg.role === "user" ? "user" : "assistant";
      const final = msg.transcriptType === "final";
      renderTranscript(role, msg.transcript, final);
      if (role === "user" && final) userSpeechEndAt = performance.now();
      return;
    }
    if (
      msg?.type === "tool-calls" ||
      msg?.type === "function-call" ||
      msg?.type === "tool-call"
    ) {
      const args = extractBookFlight(msg);
      if (args) {
        renderTicket(args);
        statUnconfirmed.textContent = "0";
        showBanner(
          `Booked: ${args.airline} ${args.from} → ${args.to}, $${Number(args.price).toFixed(0)}.`,
          "info",
        );
      }
    }
  });

  v.on("error", (e: any) => {
    console.error("[vapi error]", e);
    const text =
      e?.errorMsg || e?.error?.message || e?.message ||
      (typeof e === "string" ? e : "Something went wrong with the call.");
    setStatus("error");
    showBanner(humanizeError(text));
    isLive = false;
    stopTimer();
    callBtn.classList.remove("is-active");
    callBtnLabel.textContent = "Call";
    muteBtn.disabled = true;
  });
}

function humanizeError(text: string): string {
  const t = text.toLowerCase();
  if (t.includes("permission") || t.includes("denied") || t.includes("microphone"))
    return "Microphone access was blocked. Allow mic permission in your browser and try again.";
  if (t.includes("key") || t.includes("unauthor") || t.includes("401") || t.includes("403"))
    return "That Vapi public key was rejected. Double-check the PUBLIC key from dashboard.vapi.ai → API Keys.";
  if (t.includes("network") || t.includes("connect"))
    return "Couldn't reach Vapi. Check your connection and try again.";
  return `Call error: ${text}`;
}

/* --------------------------- Controls --------------------------- */
function resolveKey(): string {
  const fromField = keyInput.value.trim();
  const fromEnv = (import.meta.env.VITE_VAPI_PUBLIC_KEY ?? "").trim();
  return fromField || fromEnv;
}

async function startCall() {
  const key = resolveKey();
  if (!key) {
    showBanner("Add your Vapi PUBLIC key (top-right) or set VITE_VAPI_PUBLIC_KEY to start the call.");
    keyInput.focus();
    return;
  }
  clearBanner();
  setStatus("connecting");
  callBtn.disabled = true;
  try {
    vapi = new Vapi(key); // (re)create with resolved key so the field can override env
    attachHandlers(vapi);
    await vapi.start(buildAssistant() as any);
  } catch (e: any) {
    console.error("[start failed]", e);
    setStatus("error");
    showBanner(humanizeError(e?.message || e?.errorMsg || "Could not start the call."));
  } finally {
    callBtn.disabled = false;
  }
}
function endCall() {
  vapi?.stop();
}

callBtn.addEventListener("click", () => {
  if (isLive) endCall();
  else startCall();
});

muteBtn.addEventListener("click", () => {
  if (!vapi || !isLive) return;
  isMuted = !isMuted;
  vapi.setMuted(isMuted);
  muteBtn.classList.toggle("is-muted", isMuted);
  muteBtn.setAttribute("aria-label", isMuted ? "Unmute" : "Mute");
});

/* ---- boot ---- */
if (import.meta.env.VITE_VAPI_PUBLIC_KEY) {
  keyInput.placeholder = "using .env key — paste to override";
}

// Real phone CTA: reveal only when a number is configured (see provision-phone).
const phoneNumber = (import.meta.env.VITE_VAPI_PHONE_NUMBER ?? "").trim();
if (phoneNumber) {
  const cta = $<HTMLAnchorElement>("phone-cta");
  cta.href = `tel:${phoneNumber.replace(/[^\d+]/g, "")}`;
  $("phone-cta-number").textContent = phoneNumber;
  cta.hidden = false;
}

refreshDial();
setStatus("idle");
