// Turns an Aloxy.Core "thing" (the JSON Core pushes to its HTTP hook, or returns
// from /core/things.json) into the flat shape the dashboard draws.
// Field paths come from Core 1.26.1's OpenAPI spec (/core/openapi.json).
// Any field can be missing, so everything except deviceId is nullable.

export type ConnectionLevel = "OK" | "WARNING" | "ALERT";

export type ValveState = {
  deviceId: string; // 16-hex-char devEUI, e.g. 70B3D57BB1000001
  name: string | null; // attributes.LogicalName, if set in Core
  openPercentage: number | null; // logical open %, 0-100
  open: boolean | null;
  closed: boolean | null;
  valid: boolean | null; // false = Core does not trust the position
  totalRotation: number | null; // normalized, degrees, 0 = closed
  battery: number | null; // state of charge, %
  connection: ConnectionLevel | null;
  calibration: string | null; // NOT_CALIBRATED, CALIBRATED, ERROR, ...
  valveType: string | null; // MULTI_TURN, HORIZONTAL_QUARTER_TURN, ...
  sensorTimestamp: string | null; // when the sensor last reported a position
  receivedAt: string; // when this dashboard received the update
};

type Json = Record<string, unknown>;

function get(obj: unknown, path: string): unknown {
  let cur: unknown = obj;
  for (const key of path.split(".")) {
    if (cur === null || typeof cur !== "object") return undefined;
    cur = (cur as Json)[key];
  }
  return cur;
}

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const bool = (v: unknown) => (typeof v === "boolean" ? v : null);
const str = (v: unknown) => (typeof v === "string" && v !== "" ? v : null);

/** Returns null if the object doesn't look like an Aloxy thing. */
export function toValveState(thing: unknown, receivedAt = new Date()): ValveState | null {
  const thingId = str(get(thing, "thingId"));
  if (!thingId) return null;
  // thingId is "aloxy:<devEUI>"; keep whatever follows the namespace.
  const deviceId = thingId.includes(":") ? thingId.slice(thingId.indexOf(":") + 1) : thingId;

  const vp = "features.ValvePosition.properties";
  const level = str(get(thing, "features.ConnectionStatus.properties.status.level"));

  return {
    deviceId,
    name: str(get(thing, "attributes.LogicalName")),
    openPercentage: num(get(thing, `${vp}.status.logicalPosition.openPercentage`)),
    open: bool(get(thing, `${vp}.status.logicalPosition.open`)),
    closed: bool(get(thing, `${vp}.status.logicalPosition.closed`)),
    valid: bool(get(thing, `${vp}.status.valid`)),
    totalRotation: num(get(thing, `${vp}.status.physicalPosition.normalizedTotalRotation`)),
    battery: num(get(thing, "features.Battery.properties.status.stateOfCharge")),
    connection: level === "OK" || level === "WARNING" || level === "ALERT" ? level : null,
    calibration: str(get(thing, `${vp}.configuration.calibrationStatus`)),
    valveType: str(get(thing, `${vp}.configuration.valveType`)),
    sensorTimestamp: str(get(thing, `${vp}.status.timestamp`)),
    receivedAt: receivedAt.toISOString(),
  };
}
