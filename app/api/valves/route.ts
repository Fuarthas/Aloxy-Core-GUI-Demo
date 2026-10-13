// GET /api/valves — what the dashboard polls. DELETE clears all stored valves
// (token required), handy after a demo with throwaway device IDs.

import { connection } from "next/server";
import { checkIngestToken } from "@/lib/auth";
import { clearValves, loadValves, storeKind } from "@/lib/store";

export async function GET() {
  await connection(); // always run per request, never prerender a snapshot
  const valves = await loadValves();
  return Response.json(
    { valves, store: storeKind, serverTime: new Date().toISOString() },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function DELETE(request: Request) {
  const denied = checkIngestToken(request);
  if (denied) return denied;
  await clearValves();
  return Response.json({ cleared: true });
}
