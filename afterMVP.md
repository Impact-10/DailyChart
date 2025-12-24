# After-MVP Notes
- Use API_BASE_URL via --dart-define for builds; no hardcoded hosts (emulator: http://10.0.2.2:3000, LAN: http://<LAN-IP>:3000).
- Backend stays astronomy-engine for now; abstraction preserved to swap Swiss Ephemeris later without API changes.
- External APIs (WeatherAPI primary, Sunrise-Sunset + VisualCrossing fallbacks) must be server-side/proxied; no client-side keys.
- Health endpoint added: GET /api/health returns { status: "ok", serverTime, timezone } for app banner/monitoring.
- Hosting targets (future): Render/Fly/Railway/Cloud Run/App Runner/Azure App Service with uptime monitoring.
