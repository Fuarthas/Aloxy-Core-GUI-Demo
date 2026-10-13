"use client";

// Polls /api/valves every POLL_MS and redraws. A 1 s clock keeps the
// "x minutes ago" labels and STALE checks moving between polls.

import { useEffect, useMemo, useState } from "react";
import type { ValveState } from "@/lib/aloxy";
import { lastSeen, timeAgo, valveStatus } from "@/lib/status";
import { plant, POLL_MS, STALE_AFTER_MINUTES } from "@/config/plant";
import { PlantLine } from "./PlantLine";
import styles from "./dashboard.module.css";

type ApiResponse = { valves: ValveState[]; store: string; serverTime: string };

export function Dashboard() {
  const [valves, setValves] = useState<ValveState[]>([]);
  const [store, setStore] = useState<string | null>(null);
  const [lastOk, setLastOk] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [clockOffset, setClockOffset] = useState(0); // server minus browser clock
  const [tick, setTick] = useState<number | null>(null); // set in the browser only

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const res = await fetch("/api/valves", { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: ApiResponse = await res.json();
        if (cancelled) return;
        setValves(data.valves);
        setStore(data.store);
        setClockOffset(Date.parse(data.serverTime) - Date.now());
        setLastOk(Date.now());
        setError(null);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    }
    const start = setTimeout(() => setTick(Date.now()), 0);
    poll();
    const p = setInterval(poll, POLL_MS);
    const c = setInterval(() => setTick(Date.now()), 1000);
    return () => {
      cancelled = true;
      clearTimeout(start);
      clearInterval(p);
      clearInterval(c);
    };
  }, []);

  const now = (tick ?? 0) + clockOffset;
  const byId = useMemo(() => new Map(valves.map((v) => [v.deviceId, v])), [valves]);

  const assigned = new Set(plant.flatMap((l) => l.valves));
  const unassigned = valves.map((v) => v.deviceId).filter((id) => !assigned.has(id)).sort();
  const lines = unassigned.length ? [...plant, { name: "Unassigned", valves: unassigned }] : plant;

  const live = tick !== null && lastOk !== null && tick - lastOk < POLL_MS * 3;
  if (tick === null) return <main className={styles.page} />;

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1>Valve Line Up</h1>
        <div className={styles.headerRight}>
          {store === "memory" && <span className={styles.warn}>no Redis: data is not shared between servers</span>}
          <span className={live ? styles.live : styles.offline}>
            {live ? "● LIVE" : error ? `● DISCONNECTED (${error})` : "● CONNECTING"}
          </span>
          <span className={styles.clock}>{new Date(now).toLocaleTimeString()}</span>
        </div>
      </header>

      <section className={styles.diagram}>
        {lines.map((l) => (
          <PlantLine
            key={l.name}
            name={l.name}
            deviceIds={l.valves}
            valves={byId}
            tankLevel={"tankLevel" in l ? l.tankLevel : undefined}
            now={now}
            staleMinutes={STALE_AFTER_MINUTES}
          />
        ))}
      </section>

      <table className={styles.table}>
        <thead>
          <tr>
            <th>Device</th>
            <th>Status</th>
            <th>Open</th>
            <th>Rotation</th>
            <th>Battery</th>
            <th>Connection</th>
            <th>Calibration</th>
            <th>Valve type</th>
            <th>Last update</th>
          </tr>
        </thead>
        <tbody>
          {valves.length === 0 && (
            <tr>
              <td colSpan={9} className={styles.empty}>
                No sensor data yet. Send a test payload from Node-RED on the Pi.
              </td>
            </tr>
          )}
          {[...valves]
            .sort((a, b) => a.deviceId.localeCompare(b.deviceId))
            .map((v) => {
              const s = valveStatus(v, now, STALE_AFTER_MINUTES);
              return (
                <tr key={v.deviceId}>
                  <td className={styles.mono}>{v.name ? `${v.name} · ${v.deviceId}` : v.deviceId}</td>
                  <td>
                    <span className={`${styles.pill} ${styles[`pill_${s.tone}`]}`}>{s.label}</span>
                  </td>
                  <td>{v.valid === false ? "N/A" : fmt(v.openPercentage, "%")}</td>
                  <td>{fmt(v.totalRotation, "°")}</td>
                  <td>{fmt(v.battery, "%")}</td>
                  <td>{v.connection ?? "N/A"}</td>
                  <td>{pretty(v.calibration)}</td>
                  <td>{pretty(v.valveType)}</td>
                  <td>{timeAgo(now - lastSeen(v))}</td>
                </tr>
              );
            })}
        </tbody>
      </table>
    </main>
  );
}

const fmt = (n: number | null, unit: string) => (n === null ? "N/A" : `${Math.round(n)}${unit}`);
const pretty = (s: string | null) => (s ? s.replaceAll("_", " ").toLowerCase() : "N/A");
