/**
 * types.ts — shapes shared between the UI and the backend (server/index.mjs).
 * Keep in sync with the `record` object the server builds.
 */

/** A finalized line in the call transcript. */
export interface TranscriptTurn {
  /** "relay" = our agent; "business" = whoever it called (you, in the demo). */
  role: "relay" | "business";
  text: string;
}

/** The structured outcome the agent reports via the `report_result` tool. */
export interface TaskResult {
  /** true = done, false = couldn't, null = unknown (fell back to Vapi summary). */
  success: boolean | null;
  summary: string;
  confirmation?: string;
  details?: string;
}

/** Lifecycle of an outbound call, mirroring Vapi's call statuses. */
export type TaskStatus =
  | "queued"
  | "ringing"
  | "in-progress"
  | "forwarding"
  | "ended"
  | "failed";

/** One task = one outbound call the assistant makes for you. */
export interface Task {
  id: string;
  createdAt: string;
  task: string;
  business: { name: string; number: string };
  user: { name: string; callbackNumber: string };
  details: string;
  status: TaskStatus;
  callId: string | null;
  transcript: TranscriptTurn[];
  result: TaskResult | null;
  endedReason: string | null;
  recordingUrl: string | null;
  error: string | null;
}

/** Response from GET /api/health. */
export interface Health {
  ok: boolean;
  configured: boolean;
  publicUrl: string;
  webhookReachable: boolean;
}
