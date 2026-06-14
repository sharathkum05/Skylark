/** Vapi inbound line for the live "Call to try" CTA on the landing page. */
export const DEFAULT_SKYLARK_DEMO_NUMBER = "+1 (803) 879-1349";

export const SKYLARK_DEMO_NUMBER =
  process.env.NEXT_PUBLIC_SKYLARK_DEMO_NUMBER?.trim() || DEFAULT_SKYLARK_DEMO_NUMBER;

export const SKYLARK_DEMO_TEL = SKYLARK_DEMO_NUMBER.replace(/[^\d+]/g, "");
