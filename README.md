# Aloxy valve dashboard

A live "line up" screen for Aloxy valve position sensors, in the style of an Ignition Perspective page. It's a Next.js app hosted on Vercel and fed by Aloxy.Core running on a Raspberry Pi. The Pi's monitor shows it in a full-screen browser.

```
sensor or test payload
  -> Aloxy.Core (Docker on Pi, :8080)            decodes the raw payload into valve position
  -> HTTP hook -> Node-RED (Docker on Pi, :1880)  Aloxy's Modbus flow + dashboard add-on tab
  -> POST https://<app>.vercel.app/api/ingest     Bearer INGEST_TOKEN
  -> Upstash Redis                                 latest state per valve
  <- GET /api/valves, polled every 2 s by the page
  -> Chromium kiosk on the Pi's monitor
```

## What's where

| Path | Purpose |
|---|---|
| `config/plant.ts` | **Edit this:** pipe lines, which valve IDs sit on each, tank levels, stale timeout |
| `lib/aloxy.ts` | Aloxy.Core thing JSON → flat `ValveState` (field paths from Core 1.26.1's OpenAPI spec) |
| `lib/status.ts` | Rules for valve colour and label (ERROR / OFFLINE / STALE / WARNING / OPEN / CLOSED / x% OPEN) |
| `lib/store.ts` | Redis storage, or memory when Redis isn't configured |
| `app/api/ingest` | `POST`: accepts one thing or an array. Needs the token. |
| `app/api/valves` | `GET`: current state of all valves. `DELETE`: clears them (needs the token). |
| `components/` | The SVG diagram and the details table |
| `scripts/simulate.mjs` | Fake sensors, for testing without the Pi |
| `pi/kiosk.sh` | Full-screen browser on the Pi's monitor, started at login |
| `node-red/aloxy-to-dashboard.json` | Node-RED add-on tab (forward to Vercel, demo buttons) |
| `scripts/merge-node-red-flow.mjs` | Joins the add-on onto Aloxy's Modbus flow into one import file |

## Run locally

```bash
npm install
cp .env.example .env.local        # then set INGEST_TOKEN to any long random string
npm run dev                       # http://localhost:3000
INGEST_TOKEN=<same token> npm run simulate
```

Without Redis env vars the app stores data in memory. That's fine for `npm run dev`, but **not on Vercel**: each request can land on a different server, so the dashboard would flicker or stay empty. The header shows a warning when this happens.

## Deploy to Vercel

1. Push this repo to GitHub, then on vercel.com choose **Add New → Project** and import it. No build settings need changing.
2. Under the project's **Storage** tab, choose **Upstash for Redis** (free tier) and connect it. This adds `KV_REST_API_URL` and `KV_REST_API_TOKEN` automatically.
3. Under **Settings → Environment Variables**, add `INGEST_TOKEN`. Generate one with `openssl rand -hex 32`.
4. Redeploy so the new variables take effect.
5. Test from anywhere: `INGEST_TOKEN=<token> npm run simulate https://<app>.vercel.app`

## Pi setup

On the Pi, in `~/Documents/aloxy-core/`:

1. Create `.env`. Docker Compose reads it automatically, and it keeps the token out of the compose file:
   ```
   DASHBOARD_URL=https://<app>.vercel.app
   INGEST_TOKEN=<same token as Vercel>
   ```
2. Pass both variables to the `node-red` service in `docker-compose.yml`:
   ```yaml
     node-red:
       environment:
         DASHBOARD_URL: ${DASHBOARD_URL}
         INGEST_TOKEN: ${INGEST_TOKEN}
   ```
   Then run `docker compose up -d node-red`.
3. Build the combined Node-RED import on your Mac. It contains Aloxy's flow unchanged, plus the dashboard add-on tab:
   ```bash
   node scripts/merge-node-red-flow.mjs "<path>/Import into Nodered for Aloxy HTTP Push to Modbus translation.json" combined-flow.json
   ```
   The only change to Aloxy's tab is a **link out** node, wired from `POST /aloxy` and from the start-up `things.json` split. Node-RED delivers each request to only one `/aloxy` listener, so the add-on can't have its own. `combined-flow.json` is gitignored.
4. In Node-RED (`http://<pi-ip>:1880`), install `node-red-contrib-modbus` via **☰ → Manage palette**, because Aloxy's flow needs it. Then choose **☰ → Import**, pick `combined-flow.json`, and click **Deploy**.
5. Click the demo inject buttons on the **Aloxy → Vercel dashboard** tab and watch the dashboard. To keep valves moving on their own, double-click **auto demo**, enable it, and deploy.

The demo buttons use Aloxy.Core's real decoder, so each demo device ID registers in Core and probably uses one of the 10 licence slots. [unverified]

## Kiosk (Pi monitor)

The Pi runs Raspberry Pi OS (Debian 13) with labwc and auto-login.

1. Copy `pi/kiosk.sh` to `~/kiosk.sh` on the Pi and run `chmod +x ~/kiosk.sh`. It waits up to 2 minutes for internet, then opens Chromium full screen. It needs `--ozone-platform=wayland`; without it Chromium tries X11 and exits.
2. Create `~/.config/labwc/autostart`: copy `/etc/xdg/labwc/autostart` (your file replaces the system one, so keep its lines), then add `/home/aloxy/kiosk.sh &`.
3. Turn off screen blanking: `sudo raspi-config` → Display Options → Screen Blanking → No.
4. Turn off Wi-Fi power saving, or the Pi drops off the network when idle: `sudo nmcli connection modify <wifi-connection> 802-11-wireless.powersave 2`

To leave the kiosk, press Alt+F4.

## Changing the layout

Edit `config/plant.ts`, commit and push. Vercel redeploys on every push to `main`, and the kiosk picks up the change on its next reload.
