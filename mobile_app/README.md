# Daily Chart Mobile (Flutter)

Flutter client for the Daily Transit Chart features you already serve from Node/Express.

## What it does
- Rasi Chart (via `/api/daily-chart`)
- Panchang (Tithi, Nakshatra, Yoga, Karana, Nalla Neram) via `/api/panchang`
- Auspicious Times (Rahu Kaal, Yamaganda, sunrise/sunset) via `/api/auspicious-times`

## Quick start
1) Install Flutter SDK (3.22+).
2) From `mobile_app/`: `flutter pub get`.
3) Run the existing backend (`npm start` in repo root).
4) Launch on Android emulator (uses host loopback):
	`flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3000 -d emulator-5554`
	For web: `flutter run --dart-define=API_BASE_URL=http://localhost:3000 -d chrome`
	For real device on LAN: find your IP (`ipconfig`/`ifconfig`) and run
	`flutter run --dart-define=API_BASE_URL=http://<your-LAN-IP>:3000 -d <device>`

## Config
- `lib/config.dart` holds base URL and API keys.
- Before release, move keys to `--dart-define` or secure storage; do not ship secrets in source.
- Base URL defaults to `http://localhost:3000`; point it to your deployed backend for production.

## API coverage
- Uses your existing endpoints: `/api/daily-chart`, `/api/panchang`, `/api/auspicious-times`, `/api/cities` (if needed later).
- External keys available for future use: IPGeolocation, WeatherAPI, VisualCrossing.

## UI notes
- Bottom navigation: Chart / Panchang / Auspicious / Settings
- Date pickers for selecting the day, city dropdown, and simple data cards for results.

## Next improvements
- Add caching and offline storage.
- Replace key constants with secure runtime injection.
- Add richer chart visuals (grid + glyphs) using SVG/CustomPaint.
- Integrate direct calls to external sunrise/moon APIs as fallbacks.
