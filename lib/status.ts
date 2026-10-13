// Decides what a valve looks like on screen. First matching rule wins, so
// problems (red, amber) always beat position (green, grey, blue).

import type { ValveState } from "./aloxy";

export type Tone = "error" | "warning" | "open" | "partial" | "closed" | "unknown" | "none";

export type ValveStatus = { label: string; tone: Tone };

/** When the sensor last reported, falling back to when we received it. */
export function lastSeen(v: ValveState): number {
  return Date.parse(v.sensorTimestamp ?? v.receivedAt);
}

export function valveStatus(v: ValveState | undefined, now: number, staleMinutes: number): ValveStatus {
  if (!v) return { label: "NO DATA", tone: "none" };
  if (v.valid === false) return { label: "ERROR", tone: "error" };
  if (v.calibration === "ERROR") return { label: "CALIBRATION ERROR", tone: "error" };
  if (v.connection === "ALERT") return { label: "OFFLINE", tone: "error" };
  if (now - lastSeen(v) > staleMinutes * 60_000) return { label: "STALE", tone: "warning" };
  if (v.connection === "WARNING") return { label: "WARNING", tone: "warning" };

  const p = v.openPercentage;
  if (p === null) return { label: "UNKNOWN", tone: "unknown" };
  if (v.closed === true || p === 0) return { label: "CLOSED", tone: "closed" };
  if (v.open === true || p === 100) return { label: "OPEN", tone: "open" };
  return { label: `${p}% OPEN`, tone: "partial" };
}

/** Lets fluid flow past this valve in the diagram. */
export function passesFlow(v: ValveState | undefined): boolean {
  return !!v && v.valid !== false && (v.openPercentage ?? 0) > 0;
}

export function timeAgo(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 10) return "just now";
  if (s < 60) return `${s} seconds ago`;
  const m = Math.round(s / 60);
  if (m < 60) return m === 1 ? "1 minute ago" : `${m} minutes ago`;
  const h = Math.round(m / 60);
  if (h < 48) return h === 1 ? "1 hour ago" : `${h} hours ago`;
  return `${Math.round(h / 24)} days ago`;
}
