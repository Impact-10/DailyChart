import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config.dart';

class ApiClient {
  ApiClient({http.Client? client}) : _client = client ?? http.Client();

  final http.Client _client;

  Future<Map<String, dynamic>> getJson(String path, {Map<String, String>? params}) async {
    if (AppConfig.apiBaseUrl.isEmpty) {
      throw Exception('API_BASE_URL not set. Run with --dart-define=API_BASE_URL=http://<host>:<port>');
    }

    final uri = Uri.parse('${AppConfig.apiBaseUrl}$path').replace(queryParameters: params);

    const maxAttempts = 3;
    int attempt = 0;
    Object? lastError;

    while (attempt < maxAttempts) {
      attempt++;
      try {
        final res = await _client.get(uri);
        if (res.statusCode >= 200 && res.statusCode < 300) {
          return json.decode(res.body) as Map<String, dynamic>;
        }
        lastError = Exception('GET $path failed: ${res.statusCode} ${res.body}');
      } catch (e) {
        lastError = e;
      }

      if (attempt < maxAttempts) {
        await Future.delayed(Duration(milliseconds: 200 * attempt));
      }
    }

    throw lastError ?? Exception('GET $path failed after retries');
  }
}
