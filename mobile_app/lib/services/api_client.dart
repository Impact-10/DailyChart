import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import '../config.dart';

class ApiClient {
  ApiClient({http.Client? client}) : _client = client ?? http.Client() {
    // For testing/dev: relax certificate verification to work around SSL issues.
    HttpOverrides.global = _MyHttpOverrides();
    print('[ApiClient] Initialized with API_BASE_URL: ${AppConfig.apiBaseUrl}');
  }

  final http.Client _client;

  static void setupHttpOverrides() {
    HttpOverrides.global = _MyHttpOverrides();
    print('[ApiClient] HTTP overrides setup complete');
  }

  Future<Map<String, dynamic>> getJson(String path, {Map<String, String>? params}) async {
    if (AppConfig.apiBaseUrl.isEmpty) {
      throw Exception('API_BASE_URL not set. Run with --dart-define=API_BASE_URL=http://<host>:<port>');
    }

    final uri = Uri.parse('${AppConfig.apiBaseUrl}$path').replace(queryParameters: params);
    print('[ApiClient] GET $uri');

    const maxAttempts = 3;
    int attempt = 0;
    Object? lastError;

    while (attempt < maxAttempts) {
      attempt++;
      try {
        print('[ApiClient] Attempt $attempt/$maxAttempts');
        final res = await _client.get(uri).timeout(
          const Duration(seconds: 10),
          onTimeout: () {
            throw Exception('Request timeout after 10s');
          },
        );
        print('[ApiClient] Status: ${res.statusCode}');
        if (res.statusCode >= 200 && res.statusCode < 300) {
          return json.decode(res.body) as Map<String, dynamic>;
        }
        lastError = Exception('GET $path failed: ${res.statusCode} ${res.body}');
        print('[ApiClient] Error: $lastError');
      } catch (e) {
        lastError = e;
        print('[ApiClient] Exception: $e');
      }

      if (attempt < maxAttempts) {
        final delayMs = 200 * attempt;
        print('[ApiClient] Retrying in ${delayMs}ms...');
        await Future.delayed(Duration(milliseconds: delayMs));
      }
    }

    throw lastError ?? Exception('GET $path failed after retries');
  }
}

class _MyHttpOverrides extends HttpOverrides {
  @override
  HttpClient createHttpClient(SecurityContext? context) {
    print('[HttpOverrides] Creating HTTP client with relaxed certificate verification');
    return super.createHttpClient(context)
      ..badCertificateCallback = (X509Certificate cert, String host, int port) {
        print('[HttpOverrides] Certificate callback for $host:$port - accepting');
        return true; // Accept all certificates (for testing only).
      };
  }
}
