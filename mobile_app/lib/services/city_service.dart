import 'api_client.dart';

class CityService {
  CityService(this._client);
  final ApiClient _client;

  Future<List<String>> fetchCities() async {
    final data = await _client.getJson('/api/cities');
    if (data is List) {
      return (data as List).map((e) => e.toString()).toList();
    }
    final names = data['names'] as List?;
    if (names != null) {
      return names.map((e) => e.toString()).toList();
    }
    throw Exception('Invalid cities response');
  }

  Future<List<Map<String, dynamic>>> fetchCityItems() async {
    final data = await _client.getJson('/api/cities');
    final items = data['items'] as List?;
    if (items != null) {
      return items.cast<Map<String, dynamic>>().toList();
    }
    if (data is List) {
      return (data as List).map((e) => {'name': e.toString()}).toList();
    }
    throw Exception('Invalid cities response');
  }
}
