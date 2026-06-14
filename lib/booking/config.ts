/** Demo restaurant — change these for your real business. */
export const BUSINESS = {
  name: "The Copper Table",
  tagline: "modern American bistro",
  timezone: process.env.BUSINESS_TIMEZONE || "America/New_York",
  /** Lunch slots offered when caller asks for "today" / lunch. */
  lunchSlots: ["13:00", "13:30", "14:00", "15:00", "15:30", "16:00"],
  defaultPartySize: 2,
  slotDurationMinutes: 90,
} as const;

export const SKYLARK_INTRO = `Hi, this is Skylark, the AI assistant for ${BUSINESS.name}. What would you like me to do?`;
