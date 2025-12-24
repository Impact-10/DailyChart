# Progress Log (sofar.md)
- Created Flutter mobile scaffold, services, and screens wired to Node endpoints (/api/daily-chart, /api/panchang, /api/auspicious-times, /api/cities).
- Added API key notes in FREE_API_ALTERNATIVES.txt (WeatherAPI, IPGeolocation, VisualCrossing).
- Fixed Dart analyzer issues and generated Flutter platform files via `flutter create .`.
- Current task: switch API base to env-driven (API_BASE_URL via --dart-define), keep astronomy-engine for now, design for swap to Swiss Ephemeris later, and implement reliable client patterns.
