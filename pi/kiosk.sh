#!/bin/sh
# Opens the valve dashboard full screen on the Pi monitor.
# Started at login by ~/.config/labwc/autostart. Exit with Alt+F4.
URL="https://aloxy-core-gui-demo.vercel.app"

# Wait up to 2 min for internet (Wi-Fi or hotspot joins after login),
# so Chromium does not get stuck on an error page at boot.
for i in $(seq 1 60); do
  curl -s -o /dev/null --max-time 3 "$URL/api/valves" && break
  sleep 2
done

exec chromium --ozone-platform=wayland --kiosk --noerrdialogs --disable-infobars --no-first-run \
  --password-store=basic --incognito "$URL"
