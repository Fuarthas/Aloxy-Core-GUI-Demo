// Write endpoints are protected by a shared secret (INGEST_TOKEN) that only the
// Pi's Node-RED and the simulator know. Sent as "Authorization: Bearer <token>".

import { timingSafeEqual } from "node:crypto";

export function checkIngestToken(request: Request): Response | null {
  const expected = process.env.INGEST_TOKEN;
  if (!expected) {
    return Response.json({ error: "INGEST_TOKEN is not set on the server" }, { status: 500 });
  }
  const given = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  return null;
}
