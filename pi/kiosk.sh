#!/bin/sh
# Opens the valve dashboard on the Pi monitor as a tab in the normal Firefox.
# Started at login by ~/.config/labwc/autostart.
# Press F11 in Firefox to toggle full screen (tabs come back with F11 again).
# For a locked full-screen kiosk (no tabs, exit with Alt+F4), set KIOSK="--kiosk".
URL="https://aloxy-core-gui-demo.vercel.app"
KIOSK=""

# Wait up to 2 min for internet (Wi-Fi or hotspot joins after login),
# so the tab does not get stuck on an error page at boot.
for i in $(seq 1 60); do
  curl -s -o /dev/null --max-time 3 "$URL/api/valves" && break
  sleep 2
done

exec firefox $KIOSK "$URL"
