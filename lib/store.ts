// Latest state per valve. On Vercel this must be Upstash Redis: serverless
// functions don't share memory, so the request that stores an update is
// usually not the one that serves the dashboard.
// Without Redis env vars (local `npm run dev`) it falls back to memory.

import { Redis } from "@upstash/redis";
import type { ValveState } from "./aloxy";

const KEY = "aloxy:valves"; // Redis hash: deviceId -> ValveState

// Upstash's own names, or the ones Vercel's Upstash integration injects.
const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
const redis = url && token ? new Redis({ url, token }) : null;

const memory = new Map<string, ValveState>();

export const storeKind = redis ? "redis" : "memory";

export async function saveValves(valves: ValveState[]): Promise<void> {
  if (valves.length === 0) return;
  if (redis) {
    await redis.hset(KEY, Object.fromEntries(valves.map((v) => [v.deviceId, v])));
  } else {
    for (const v of valves) memory.set(v.deviceId, v);
  }
}

export async function loadValves(): Promise<ValveState[]> {
  if (redis) {
    const all = await redis.hgetall<Record<string, ValveState>>(KEY);
    return Object.values(all ?? {});
  }
  return [...memory.values()];
}

export async function clearValves(): Promise<void> {
  if (redis) await redis.del(KEY);
  else memory.clear();
}
