import { join } from "node:path";

/** Writable data dir — `/tmp` on Vercel, `data/` locally. */
export function getDataDir(): string {
  if (process.env.VERCEL) return join("/tmp", "skylark-data");
  return join(process.cwd(), "data");
}
