import 'api_client.dart';

class HealthService {
  HealthService(this._client);
  final ApiClient _client;

  Future<Map<String, dynamic>> fetchHealth() async {
    return _client.getJson('/api/health');
  }
}
