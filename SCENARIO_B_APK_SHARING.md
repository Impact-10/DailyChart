# Scenario B: Sharing an APK with Others

## 1) Why LAN/emulator URLs fail when sharing an APK
- `10.0.2.2` works **only** inside the Android emulator; it points to the host loopback.
- LAN IPs (e.g., `http://192.168.x.x:3000`) work **only** when the phone and laptop are on the same Wi‑Fi. A friend on another network cannot reach your laptop.
- Therefore, any APK built with emulator/LAN URLs will fail for others.

## 2) What is required for friend/client testing
- Backend must be **publicly accessible** on the internet.
- Build the APK with a **public API URL** (not localhost, not LAN).

## 3) Deploying the backend on Render (example)
1. Create a Render account (https://render.com/).
2. Connect your GitHub repo containing the Node backend.
3. Create a **Web Service**:
   - Environment: Node
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Set Environment Variables:
     - `WEATHERAPI_KEY` = your key
     - `VISUALCROSSING_KEY` = your key (optional fallback)
     - Any others you need
   - Expose port 3000 (Render auto-detects)
4. Deploy; Render provides a public URL like `https://your-service.onrender.com`.

## 4) Flutter build command for a shareable APK
```
flutter build apk \
  --dart-define=API_BASE_URL=https://your-service.onrender.com
```
Share the generated APK from `build/app/outputs/flutter-apk/app-release.apk`.

## 5) Safe testing checklist
- Hit the health check in a browser: `https://your-service.onrender.com/api/health` should return `{"status":"ok"}`.
- Verify key endpoints: `/api/daily-chart`, `/api/panchang`, `/api/auspicious-times`, `/api/cities`, `/api/sunmoon`.
- If Render free tier sleeps, expect cold-start latency; wake it by hitting `/api/health` first.

## 6) Warnings
- Never build an APK with `localhost`, `10.0.2.2`, or LAN IPs if you plan to share it.
- Never bundle API keys in the APK. Keep keys server-side or in Render env vars.
- Keep the client calling **only your backend**; backend calls external providers (WeatherAPI primary, Sunrise-Sunset fallback, VisualCrossing secondary fallback).
