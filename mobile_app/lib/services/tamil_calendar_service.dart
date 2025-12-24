import 'api_client.dart';

class TamilCalendarService {
  TamilCalendarService(this._client);
  final ApiClient _client;

  Future<Map<String, dynamic>> fetchTamilCalendarMonth({
    required int year,
    required int month,
    String city = 'Chennai',
  }) async {
    final data = await _client.getJson(
      '/api/tamil-calendar',
      params: {
        'year': year.toString(),
        'month': month.toString(),
        'city': city,
      },
    );
    return data;
  }
}
