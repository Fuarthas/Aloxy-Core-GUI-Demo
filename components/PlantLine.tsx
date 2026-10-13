// One pipe line: pump -> valves -> tank, drawn as SVG and recoloured from live data.
// Pipe segments animate (flow) up to the first valve that blocks.

import type { ValveState } from "@/lib/aloxy";
import { lastSeen, passesFlow, timeAgo, valveStatus } from "@/lib/status";
import styles from "./dashboard.module.css";

const W = 1600;
const H = 200;
const PIPE_Y = 110;
const PIPE_START = 120;
const PIPE_END = 1420;

type Props = {
  name: string;
  deviceIds: string[];
  valves: Map<string, ValveState>;
  tankLevel?: number;
  now: number;
  staleMinutes: number;
};

export function PlantLine({ name, deviceIds, valves, tankLevel, now, staleMinutes }: Props) {
  // Spread valves evenly along the pipe.
  const step = (PIPE_END - PIPE_START) / (deviceIds.length + 1);
  const xs = deviceIds.map((_, i) => PIPE_START + step * (i + 1));
  const stops = [PIPE_START, ...xs, PIPE_END];

  // Segment i runs from stops[i] to stops[i+1]; it flows if every valve before it passes flow.
  let flowing = true;
  const segments = stops.slice(0, -1).map((x1, i) => {
    if (i > 0) flowing = flowing && passesFlow(valves.get(deviceIds[i - 1]));
    return { x1, x2: stops[i + 1], flowing };
  });
  const tankFed = flowing && passesFlow(valves.get(deviceIds[deviceIds.length - 1]));

  // The tank shows how far the line is open: the smallest opening along it,
  // since valves in series are limited by the most-closed one. null = unknown
  // (a valve has no data or Core marks its position invalid).
  const openings = deviceIds.map((id) => {
    const v = valves.get(id);
    return v && v.valid !== false ? v.openPercentage : null;
  });
  const lineOpen = openings.some((o) => o === null) ? null : Math.min(...(openings as number[]));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={styles.line} role="img" aria-label={name}>
      <text x={20} y={40} className={styles.lineName}>
        {name}
      </text>

      {segments.map((s, i) => (
        <g key={i}>
          <line x1={s.x1} x2={s.x2} y1={PIPE_Y} y2={PIPE_Y} className={styles.pipe} />
          {s.flowing && (
            <line x1={s.x1} x2={s.x2} y1={PIPE_Y} y2={PIPE_Y} className={styles.flow} />
          )}
        </g>
      ))}

      <Pump x={70} y={PIPE_Y} />
      <Tank x={PIPE_END} y={PIPE_Y} level={tankLevel ?? lineOpen} fed={tankFed} />

      {deviceIds.map((id, i) => {
        const v = valves.get(id);
        const status = valveStatus(v, now, staleMinutes);
        const x = xs[i];
        return (
          <g key={id} className={styles[`tone_${status.tone}`]}>
            <title>{v?.name ? `${v.name} (${id})` : id}</title>
            <text x={x} y={PIPE_Y - 42} className={styles.valveId}>
              {v?.name ?? id.slice(-5)}
            </text>
            <path
              d={`M${x - 34},${PIPE_Y - 28} L${x},${PIPE_Y} L${x - 34},${PIPE_Y + 28} Z
                  M${x + 34},${PIPE_Y - 28} L${x},${PIPE_Y} L${x + 34},${PIPE_Y + 28} Z`}
              className={styles.valve}
            />
            <text x={x} y={PIPE_Y + 56} className={styles.valveStatus}>
              {status.label}
            </text>
            <text x={x} y={PIPE_Y + 80} className={styles.valveAgo}>
              {v ? timeAgo(now - lastSeen(v)) : "waiting for sensor"}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function Pump({ x, y }: { x: number; y: number }) {
  return (
    <g className={styles.equipment}>
      <circle cx={x} cy={y} r={30} />
      <path d={`M${x - 30},${y + 30} L${x - 40},${y + 44} L${x + 40},${y + 44} L${x + 30},${y + 30}`} />
      <rect x={x} y={y - 30} width={50} height={14} />
    </g>
  );
}

function Tank({ x, y, level, fed }: { x: number; y: number; level: number | null; fed: boolean }) {
  const top = y - 70;
  const h = 140;
  const fill = level === null ? 0 : (Math.min(100, Math.max(0, level)) / 100) * h;
  return (
    <g className={styles.equipment}>
      <rect x={x} y={top} width={110} height={h} rx={12} />
      {fill > 0 && (
        <rect x={x + 2} y={top + h - fill} width={106} height={fill - 2} rx={10} className={fed ? styles.liquidFed : styles.liquid} />
      )}
      <text x={x + 55} y={top + h / 2 + 6} className={styles.tankText}>
        {level === null ? "—" : `${Math.round(level)}%`}
      </text>
    </g>
  );
}
