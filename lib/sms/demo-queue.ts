import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";

export interface DemoConfirmation {
  id: string;
  to: string;
  body: string;
  guestName: string;
  partySize: number;
  startIso: string;
  createdAt: string;
  channel: "demo";
}

const DATA_FILE = join(process.cwd(), "data", "demo-sms.json");

async function readAll(): Promise<DemoConfirmation[]> {
  try {
    return JSON.parse(await readFile(DATA_FILE, "utf8")) as DemoConfirmation[];
  } catch {
    return [];
  }
}

async function writeAll(items: DemoConfirmation[]): Promise<void> {
  await mkdir(dirname(DATA_FILE), { recursive: true });
  await writeFile(DATA_FILE, JSON.stringify(items, null, 2));
}

export async function queueDemoConfirmation(
  item: Omit<DemoConfirmation, "id" | "createdAt" | "channel">,
): Promise<DemoConfirmation> {
  const entry: DemoConfirmation = {
    ...item,
    id: `sms_${Date.now().toString(36)}`,
    createdAt: new Date().toISOString(),
    channel: "demo",
  };
  const all = await readAll();
  all.unshift(entry);
  await writeAll(all.slice(0, 50));
  return entry;
}

export async function listDemoConfirmations(): Promise<DemoConfirmation[]> {
  return readAll();
}
