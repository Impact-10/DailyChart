import 'api_client.dart';

class AuspiciousService {
  AuspiciousService(this._client);
  final ApiClient _client;

  Future<Map<String, dynamic>> fetchAuspiciousTimes({
    required String date,
    String city = 'Chennai',
  }) async {
    final data = await _client.getJson(
      '/api/auspicious-times',
      params: {
        'date': date,
        'city': city,
      },
    );
    return data;
  }
}
