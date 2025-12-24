import 'api_client.dart';

class PanchangService {
  PanchangService(this._client);
  final ApiClient _client;

  Future<Map<String, dynamic>> fetchPanchang({
    required String date,
    String city = 'Chennai',
  }) async {
    final data = await _client.getJson(
      '/api/panchang',
      params: {
        'date': date,
        'city': city,
      },
    );
    return data;
  }
}
