// The plant layout: optional named pipe lines with several valves, left to right.
// Device IDs are the 16-char devEUI (no "aloxy:"). Every valve that reports in
// but isn't listed here gets its own line, named after its device ID (or its
// LogicalName in Aloxy Core), so a new sensor always shows up.

export type PipeLine = {
  name: string;
  valves: string[];
  tankLevel?: number; // fixed % for the end tank; omit to show the line's live open %
};

export const plant: PipeLine[] = [];

// A valve with no update for this long is shown as STALE.
export const STALE_AFTER_MINUTES = Number(process.env.NEXT_PUBLIC_STALE_MINUTES ?? 15);

// How often the screen asks the server for new data.
export const POLL_MS = 2000;
