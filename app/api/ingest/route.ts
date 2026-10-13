// POST /api/ingest — Node-RED on the Pi forwards every Aloxy.Core hook call here.
// Body: one thing, or an array of things (e.g. the output of /core/things.json).

import { checkIngestToken } from "@/lib/auth";
import { toValveState } from "@/lib/aloxy";
import { saveValves } from "@/lib/store";

export async function POST(request: Request) {
  const denied = checkIngestToken(request);
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "body must be JSON" }, { status: 400 });
  }

  const things = Array.isArray(body) ? body : [body];
  const now = new Date();
  const valves = things.map((t) => toValveState(t, now)).filter((v) => v !== null);
  if (valves.length === 0) {
    return Response.json({ error: "no Aloxy things with a thingId in body" }, { status: 400 });
  }

  await saveValves(valves);
  return Response.json({ stored: valves.map((v) => v.deviceId) });
}
