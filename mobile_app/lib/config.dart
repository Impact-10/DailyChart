// Centralized config for API endpoints and keys.
// Use --dart-define to supply values at build/run time.
// Example: flutter run --dart-define=API_BASE_URL=http://192.168.1.5:3000
class AppConfig {
  const AppConfig._();

  // Base URL of your Node/Express backend. Must be provided at runtime.
  static const String apiBaseUrl = String.fromEnvironment('API_BASE_URL');

  // Optional: external keys if you choose direct calls (prefer server-side/proxy).
  static const String ipGeolocationKey = String.fromEnvironment('IPGEO_KEY');
  static const String weatherApiKey = String.fromEnvironment('WEATHERAPI_KEY');
  static const String visualCrossingKey = String.fromEnvironment('VISUALCROSSING_KEY');
}
