// Builds one Node-RED import file: Aloxy's "HTTP Push to Modbus" flow, unchanged,
// plus the dashboard add-on tab, joined by a link node pair.
//
//   node scripts/merge-node-red-flow.mjs "<path to Aloxy flow>.json" combined-flow.json
//
// The only change to Aloxy's tab is one new "link out" node, wired from the
// POST /aloxy listener and from "Split Object into separate msg" (start-up
// things.json). Aloxy's file stays out of this repo; pass its path in.

import { readFileSync, writeFileSync } from "node:fs";

const [aloxyPath, outPath] = process.argv.slice(2);
if (!aloxyPath || !outPath) {
  console.error('usage: node scripts/merge-node-red-flow.mjs "<Aloxy flow>.json" <out.json>');
  process.exit(1);
}

const aloxy = JSON.parse(readFileSync(aloxyPath, "utf8"));
const addon = JSON.parse(readFileSync(new URL("../node-red/aloxy-to-dashboard.json", import.meta.url), "utf8"));

const httpIn = aloxy.find((n) => n.type === "http in" && n.url === "/aloxy");
if (!httpIn) throw new Error('no "http in" node with url /aloxy in the Aloxy flow');
const split = aloxy.find((n) => n.type === "function" && n.name === "Split Object into separate msg");
if (!split) console.warn("warning: no Split node found; start-up things.json won't reach the dashboard");

const linkIn = addon.find((n) => n.type === "link in");
const LINK_OUT = "a1000000000lout1";
if (aloxy.some((n) => n.id === LINK_OUT)) throw new Error("Aloxy flow already contains the dashboard link; nothing to do");

linkIn.links = [LINK_OUT];
const linkOut = {
  id: LINK_OUT,
  type: "link out",
  z: httpIn.z,
  name: "to Vercel dashboard",
  mode: "link",
  links: [linkIn.id],
  x: (split?.x ?? httpIn.x) + 200,
  y: split?.y ?? httpIn.y,
  wires: [],
};

for (const n of [httpIn, split].filter(Boolean)) n.wires[0].push(LINK_OUT);

writeFileSync(outPath, JSON.stringify([...aloxy, linkOut, ...addon], null, 2));
console.log(`wrote ${outPath}: ${aloxy.length} Aloxy nodes + 1 link + ${addon.length} add-on nodes`);
