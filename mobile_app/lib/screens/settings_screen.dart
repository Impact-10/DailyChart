import 'package:flutter/material.dart';
import '../config.dart';
import '../services/api_client.dart';
import '../services/city_service.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key, required this.cityListenable});

  final ValueNotifier<String> cityListenable;

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  List<String> _cities = const ['Chennai'];
  bool _use24h = false;
  late final CityService _cityService;

  @override
  void initState() {
    super.initState();
    _cityService = CityService(ApiClient());
    _loadCities();
  }

  Future<void> _loadCities() async {
    try {
      final list = await _cityService.fetchCities();
      if (list.isNotEmpty) {
        setState(() => _cities = list);
      }
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
      children: [
        Text('Settings', style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w800)),
        const SizedBox(height: 16),

        Text('City', style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w800)),
        const SizedBox(height: 8),
        ValueListenableBuilder<String>(
          valueListenable: widget.cityListenable,
          builder: (context, city, _) {
            return DropdownButtonFormField<String>(
              initialValue: city,
              items: _cities.map((c) => DropdownMenuItem(value: c, child: Text(c))).toList(),
              onChanged: (v) {
                if (v != null) widget.cityListenable.value = v;
              },
              decoration: const InputDecoration(labelText: 'City'),
            );
          },
        ),

        const SizedBox(height: 16),
        Text('Time format', style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w800)),
        const SizedBox(height: 8),
        SwitchListTile(
          value: _use24h,
          onChanged: (v) => setState(() => _use24h = v),
          title: Text(_use24h ? '24-hour' : '12-hour'),
          subtitle: const Text('Backend-provided time strings are displayed as-is.'),
        ),

        const SizedBox(height: 16),
        Text('About', style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w800)),
        const SizedBox(height: 8),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Daily Chart'),
                const SizedBox(height: 6),
                Text('API Base URL: ${AppConfig.apiBaseUrl}', style: theme.textTheme.bodySmall),
              ],
            ),
          ),
        ),

        const SizedBox(height: 16),
        Text('Calculation notes', style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w800)),
        const SizedBox(height: 8),
        const Card(
          child: Padding(
            padding: EdgeInsets.all(12),
            child: Text(
              'This app displays server-calculated values. Lists are rendered without client-side filtering or reordering.\n'
              'Lapse indicators are display-only and use the server timezone offset for comparisons.',
            ),
          ),
        ),
      ],
    );
  }
}
