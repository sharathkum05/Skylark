/**
 * lib/relay/store.ts — tiny JSON-file task store (no DB needed for the demo)
 * ------------------------------------------------------------------
 * Tasks persist to data/tasks.json so history survives restarts and is shared
 * across API-route invocations. Demo-scale: every call reads + rewrites the
 * whole file. Swap for a real DB if this ever grows up.
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { Task } from "./types";

const DATA_FILE = join(process.cwd(), "data", "tasks.json");

async function readAll(): Promise<Task[]> {
  try {
    return JSON.parse(await readFile(DATA_FILE, "utf8")) as Task[];
  } catch {
    return [];
  }
}

async function writeAll(tasks: Task[]): Promise<void> {
  await mkdir(dirname(DATA_FILE), { recursive: true });
  await writeFile(DATA_FILE, JSON.stringify(tasks, null, 2));
}

/** Newest-first list for the history view. */
export async function listTasks(): Promise<Task[]> {
  const all = await readAll();
  return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getTask(id: string): Promise<Task | null> {
  return (await readAll()).find((t) => t.id === id) ?? null;
}

export async function getTaskByCallId(callId: string): Promise<Task | null> {
  return (await readAll()).find((t) => t.callId === callId) ?? null;
}

/** Insert or replace a task by id. */
export async function saveTask(task: Task): Promise<void> {
  const all = await readAll();
  const i = all.findIndex((t) => t.id === task.id);
  if (i === -1) all.push(task);
  else all[i] = task;
  await writeAll(all);
}

export async function deleteTask(id: string): Promise<void> {
  await writeAll((await readAll()).filter((t) => t.id !== id));
}

let seq = 0;
export function newTaskId(): string {
  seq += 1;
  return `t_${Date.now().toString(36)}_${seq}`;
}
