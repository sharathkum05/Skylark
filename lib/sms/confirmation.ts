import { BUSINESS } from "@/lib/booking/config";
import { formatSlotForSpeech } from "@/lib/booking/slots";

import { queueDemoConfirmation } from "./demo-queue";
import { formatPhoneE164 } from "./format-phone";
import { isSmsConfigured, sendBookingConfirmationSms } from "./twilio";

export function buildConfirmationBody(opts: {
  guestName: string;
  partySize: number;
  startIso: string;
}): string {
  const when = formatSlotForSpeech(opts.startIso);
  return `Hi ${opts.guestName}, you're booked at ${BUSINESS.name} for ${opts.partySize} on ${when}. See you soon! — Skylark`;
}

export function isDemoSmsFallbackEnabled(): boolean {
  return process.env.DEMO_SMS_FALLBACK !== "false";
}

export type ConfirmationResult = "sms" | "demo" | "none";

/** Try Twilio; always queue to demo inbox when fallback is enabled. */
export async function sendBookingConfirmation(opts: {
  to: string;
  guestName: string;
  partySize: number;
  startIso: string;
}): Promise<ConfirmationResult> {
  const to = formatPhoneE164(opts.to);
  const body = buildConfirmationBody(opts);

  if (isDemoSmsFallbackEnabled()) {
    await queueDemoConfirmation({
      to,
      body,
      guestName: opts.guestName,
      partySize: opts.partySize,
      startIso: opts.startIso,
    });
  }

  if (isSmsConfigured()) {
    const sent = await sendBookingConfirmationSms({ ...opts, to }).catch(() => false);
    if (sent) return "sms";
  }

  return isDemoSmsFallbackEnabled() ? "demo" : "none";
}
