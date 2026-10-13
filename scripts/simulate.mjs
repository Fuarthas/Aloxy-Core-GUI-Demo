// Fake sensors: posts Aloxy-shaped "things" to /api/ingest so the dashboard
// moves without a Pi. Shapes match what Aloxy.Core 1.26.1 pushes to its hook.
//
//   INGEST_TOKEN=... node scripts/simulate.mjs                       # local dev server
//   INGEST_TOKEN=... node scripts/simulate.mjs https://<app>.vercel.app
//
// Every few seconds one valve changes: it moves, closes, opens, or briefly errors.

const base = (process.argv[2] ?? "http://localhost:3000").replace(/\/$/, "");
const token = process.env.INGEST_TOKEN;
const everyMs = Number(process.env.SIMULATE_EVERY_MS ?? 4000);
if (!token) {
  console.error("Set INGEST_TOKEN (same value as the server's).");
  process.exit(1);
}

const devices = ["70B3D57BB1000001", "70B3D57BB1000002", "70B3D57BB1000003"].map((id) => ({
  id,
  open: 100,
  battery: 70 + Math.round(Math.random() * 30),
  valid: true,
  connection: "OK",
}));

function thing(d) {
  const now = new Date().toISOString();
  return {
    thingId: `aloxy:${d.id}`,
    features: {
      ValvePosition: {
        properties: {
          configuration: { valveType: "HORIZONTAL_QUARTER_TURN", calibrationStatus: "CALIBRATED" },
          status: {
            valid: d.valid,
            timestamp: now,
            logicalPosition: { open: d.open === 100, closed: d.open === 0, openPercentage: d.open },
            physicalPosition: { openPercentage: d.open, normalizedTotalRotation: Math.round(d.open * 0.9) },
          },
        },
      },
      Battery: { properties: { status: { stateOfCharge: d.battery, timestamp: now } } },
      ConnectionStatus: { properties: { status: { level: d.connection } } },
    },
  };
}

function mutate(d) {
  d.valid = true;
  d.connection = "OK";
  const r = Math.random();
  if (r < 0.1) d.valid = false; // position not trusted -> ERROR
  else if (r < 0.15) d.connection = "WARNING";
  else if (r < 0.4) d.open = 0;
  else if (r < 0.7) d.open = 100;
  else d.open = Math.round(Math.random() * 100);
}

async function post(body) {
  const res = await fetch(`${base}/api/ingest`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  return `${res.status} ${await res.text()}`;
}

console.log(`Sending to ${base}/api/ingest every ${everyMs} ms. Ctrl+C to stop.`);
console.log("initial:", await post(devices.map(thing)));
setInterval(async () => {
  const d = devices[Math.floor(Math.random() * devices.length)];
  mutate(d);
  try {
    console.log(d.id, d.valid ? `${d.open}% ${d.connection}` : "INVALID", "->", await post(thing(d)));
  } catch (e) {
    console.error("send failed:", e.message);
  }
}, everyMs);
