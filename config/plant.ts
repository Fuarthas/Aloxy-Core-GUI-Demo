// The plant layout: which valves sit on which pipe line, left to right.
// Edit this to match the demo. Device IDs are the 16-char devEUI (no "aloxy:").
// Valves that report in but aren't listed here appear on an "Unassigned" line,
// so a new sensor always shows up somewhere.

export type PipeLine = {
  name: string;
  valves: string[];
  tankLevel?: number; // % shown in the tank at the end of the line (static)
};

export const plant: PipeLine[] = [
  {
    name: "Line A",
    valves: ["70B3D57BB1000001", "70B3D57BB1000002"],
    tankLevel: 45,
  },
  {
    name: "Line B",
    valves: ["70B3D57BB1000003"],
    tankLevel: 25,
  },
];

// A valve with no update for this long is shown as STALE.
export const STALE_AFTER_MINUTES = Number(process.env.NEXT_PUBLIC_STALE_MINUTES ?? 15);

// How often the screen asks the server for new data.
export const POLL_MS = 2000;
