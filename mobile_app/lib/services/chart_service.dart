import 'api_client.dart';

class ChartService {
  ChartService(this._client);
  final ApiClient _client;

  Future<Map<String, dynamic>> fetchDailyChart({
    required String date,
    String time = '05:30',
    String city = 'Chennai',
  }) async {
    final data = await _client.getJson(
      '/api/daily-chart',
      params: {
        'date': date,
        'time': time,
        'city': city,
      },
    );
    return data;
  }
}
