import 'package:flutter/material.dart';
import '../services/api_client.dart';
import '../services/panchang_service.dart';
import '../services/city_service.dart';
// Nalla Neram is provided via Panchang API response
import '../utils/minute_ticker.dart';
import '../widgets/time_window_card.dart';

class PanchangScreen extends StatefulWidget {
  const PanchangScreen({super.key});

  @override
  State<PanchangScreen> createState() => _PanchangScreenState();
}

class _PanchangScreenState extends State<PanchangScreen> {
  final _dateCtrl = TextEditingController();
  String _city = 'Chennai';
  List<String> _cities = const ['Chennai'];
  Map<String, dynamic>? _data;
  Map<String, dynamic>? _cachedData;
  DateTime? _cachedAt;
  bool _stale = false;
  bool _loading = false;
  String? _error;
  late final PanchangService _service;
  late final CityService _cityService;
  late final MinuteTicker _ticker;
  // Nalla Neram is fetched as part of Panchang; no separate service needed

  // Removed unused _buildTimeRow helper

  @override
  void initState() {
    super.initState();
    _service = PanchangService(ApiClient());
    _cityService = CityService(ApiClient());
    _ticker = MinuteTicker();
    final now = DateTime.now();
    _dateCtrl.text = now.toIso8601String().split('T').first;
    _loadCities();
    _fetch(); // Auto-fetch on load
  }

  @override
  void dispose() {
    _dateCtrl.dispose();
    _ticker.dispose();
    super.dispose();
  }

  Future<void> _loadCities() async {
    try {
      final list = await _cityService.fetchCities();
      setState(() => _cities = list.isNotEmpty ? list : _cities);
    } catch (_) {}
  }

  Future<void> _pickDate() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      firstDate: DateTime(now.year - 2),
      lastDate: DateTime(now.year + 2),
      initialDate: now,
    );
    if (picked != null) {
      _dateCtrl.text = picked.toIso8601String().split('T').first;
    }
  }

  Future<void> _fetch() async {
    if (_dateCtrl.text.isEmpty) {
      setState(() => _error = 'Pick a date');
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
      _stale = false;
    });
    try {
      final res = await _service.fetchPanchang(date: _dateCtrl.text, city: _city);
      setState(() {
        _data = res;
        _cachedData = res;
        _cachedAt = DateTime.now();
      });
    } catch (e) {
      if (_cachedData != null) {
        setState(() {
          _data = _cachedData;
          _stale = true;
          _error = 'Showing cached data';
        });
      } else {
        setState(() => _error = e.toString());
      }
    } finally {
      setState(() => _loading = false);
    }
  }

  // Nalla Neram rendering now uses _data['nallaNeram'] directly

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Panchang')),
      body: RefreshIndicator(
        onRefresh: _fetch,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: ListView(
            children: [
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _dateCtrl,
                      readOnly: true,
                      onTap: _pickDate,
                      decoration: const InputDecoration(labelText: 'Date (YYYY-MM-DD)'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: DropdownButtonFormField<String>(
                      initialValue: _city,
                      items: _cities.map((c) => DropdownMenuItem(value: c, child: Text(c))).toList(),
                      onChanged: (v) => setState(() => _city = v ?? 'Chennai'),
                      decoration: const InputDecoration(labelText: 'City'),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              if (_error != null)
                Padding(
                  padding: const EdgeInsets.only(top: 12),
                  child: Text(_error!, style: const TextStyle(color: Colors.red)),
                ),
              if (_stale)
                Padding(
                  padding: const EdgeInsets.only(top: 8),
                  child: Chip(label: Text('Stale (cached @ ${_cachedAt?.toLocal().toIso8601String() ?? ''})')),
                ),
              const SizedBox(height: 12),
              if (_loading)
                const Center(child: CircularProgressIndicator()),
              if (!_loading && _data == null)
                const Center(child: Padding(padding: EdgeInsets.all(24), child: Text('No data yet'))),
              if (!_loading && _data != null)
                ...() {
                  final tzOffset = (_data!['timezoneOffsetMinutes'] is int)
                      ? (_data!['timezoneOffsetMinutes'] as int)
                      : int.tryParse(_data!['timezoneOffsetMinutes']?.toString() ?? '') ?? 0;

                  return <Widget>[
                    Card(
                      margin: const EdgeInsets.only(bottom: 12),
                      child: Padding(
                        padding: const EdgeInsets.all(12),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Tithi: ${_data!['tithi']?['name'] ?? '-'}'),
                            Text('Nakshatra: ${_data!['nakshatra']?['name'] ?? '-'}'),
                            Text('Yoga: ${_data!['yoga']?['name'] ?? '-'}'),
                            Text('Karana: ${_data!['karana']?['name'] ?? '-'}'),
                          ],
                        ),
                      ),
                    ),

                // Inauspicious time windows (lapse applies)
                if (_data!['rahuKaal'] is Map && _data!['rahuKaal']['startTime'] != null && _data!['rahuKaal']['endTime'] != null)
                  TimeWindowCard(
                    title: 'Rahu Kalam',
                    dateStr: _dateCtrl.text,
                    startText: _data!['rahuKaal']['startTime'].toString(),
                    endText: _data!['rahuKaal']['endTime'].toString(),
                    nowLocal: _ticker.nowLocal,
                    timezoneOffsetMinutes: tzOffset,
                  ),
                if (((_data!['yamaganda'] as Map?)?['dayPeriod'] as Map?)?['startTime'] != null &&
                    (((_data!['yamaganda'] as Map?)?['dayPeriod'] as Map?)?['endTime'] != null))
                  TimeWindowCard(
                    title: 'Yamagandam (day)',
                    dateStr: _dateCtrl.text,
                    startText: (((_data!['yamaganda'] as Map)['dayPeriod'] as Map)['startTime']).toString(),
                    endText: (((_data!['yamaganda'] as Map)['dayPeriod'] as Map)['endTime']).toString(),
                    nowLocal: _ticker.nowLocal,
                    timezoneOffsetMinutes: tzOffset,
                  )
                else if (_data!['yamaganda'] is Map && _data!['yamaganda']['startTime'] != null && _data!['yamaganda']['endTime'] != null)
                  TimeWindowCard(
                    title: 'Yamagandam',
                    dateStr: _dateCtrl.text,
                    startText: _data!['yamaganda']['startTime'].toString(),
                    endText: _data!['yamaganda']['endTime'].toString(),
                    nowLocal: _ticker.nowLocal,
                    timezoneOffsetMinutes: tzOffset,
                  ),
                if ((_data!['yamaganda'] as Map?)?['nightPeriod'] is Map &&
                    ((_data!['yamaganda'] as Map?)?['nightPeriod']['startTime'] != null) &&
                    ((_data!['yamaganda'] as Map?)?['nightPeriod']['endTime'] != null))
                  TimeWindowCard(
                    title: 'Yamagandam (night)',
                    dateStr: _dateCtrl.text,
                    startText: (((_data!['yamaganda'] as Map)['nightPeriod'] as Map)['startTime']).toString(),
                    endText: (((_data!['yamaganda'] as Map)['nightPeriod'] as Map)['endTime']).toString(),
                    nowLocal: _ticker.nowLocal,
                    timezoneOffsetMinutes: tzOffset,
                  ),

                // Nalla Neram card - PURE PROJECTION (no filtering, no reformatting)
                ...() {
                  final windows = ((_data!['nallaNeram'] as Map?)?['nallaNeram'] as List?) ?? const [];
                  if (windows.isEmpty) {
                    return [
                      Card(
                        margin: const EdgeInsets.only(bottom: 12),
                        child: Padding(
                          padding: const EdgeInsets.all(12),
                          child: Text('Nalla Neram: ${((_data!['nallaNeram'] as Map?)?['nallaNeram'] as List?) == null ? '-' : 'None'}'),
                        ),
                      ),
                    ];
                  }

                  // Render each window exactly as sent (no filtering, no reordering)
                  return List<Widget>.generate(windows.length, (i) {
                    final window = windows[i] as Map;
                    final start = window['start']?.toString();
                    final end = window['end']?.toString();
                    if (start == null || end == null) {
                      return Card(
                        margin: const EdgeInsets.only(bottom: 12),
                        child: Padding(
                          padding: const EdgeInsets.all(12),
                          child: Text(window.toString()),
                        ),
                      );
                    }
                    final meta = <String>[];
                    if (window['quality'] != null || window['period'] != null) {
                      final q = window['quality']?.toString();
                      final p = window['period']?.toString();
                      if (q != null && p != null) {
                        meta.add('Quality: $q · $p');
                      } else if (q != null) {
                        meta.add('Quality: $q');
                      } else if (p != null) {
                        meta.add('Period: $p');
                      }
                    }
                    if (window['factor'] != null) {
                      meta.add('Source: ${window['factor']}');
                    }
                    return TimeWindowCard(
                      title: 'Nalla Neram',
                      dateStr: _dateCtrl.text,
                      startText: start,
                      endText: end,
                      nowLocal: _ticker.nowLocal,
                      timezoneOffsetMinutes: tzOffset,
                      metaLines: meta,
                    );
                  });
                }(),

                // Gowri slots card - PURE PROJECTION (NO FILTERING)
                ...() {
                  final windows = ((_data!['nallaNeram'] as Map?)?['gowriNallaNeram'] as List?) ?? const [];
                  if (windows.isEmpty) {
                    return <Widget>[];
                  }
                  return List<Widget>.generate(windows.length, (i) {
                    final window = windows[i] as Map;
                    final start = window['start']?.toString();
                    final end = window['end']?.toString();
                    if (start == null || end == null) {
                      return Card(
                        margin: const EdgeInsets.only(bottom: 12),
                        child: Padding(
                          padding: const EdgeInsets.all(12),
                          child: Text(window.toString()),
                        ),
                      );
                    }
                    final meta = <String>[];
                    if (window['quality'] != null || window['period'] != null) {
                      final q = window['quality']?.toString();
                      final p = window['period']?.toString();
                      if (q != null && p != null) {
                        meta.add('Quality: $q · $p');
                      } else if (q != null) {
                        meta.add('Quality: $q');
                      } else if (p != null) {
                        meta.add('Period: $p');
                      }
                    }
                    if (window['label'] != null && (window['quality'] == null)) {
                      meta.add('Label: ${window['label']}');
                    }
                    return TimeWindowCard(
                      title: 'Gowri Nalla Neram',
                      dateStr: _dateCtrl.text,
                      startText: start,
                      endText: end,
                      nowLocal: _ticker.nowLocal,
                      timezoneOffsetMinutes: tzOffset,
                      metaLines: meta,
                    );
                  });
                }(),
                // Backend transparency metadata (optional info card)
                if ((_data!['nallaNeram'] as Map?)?['calculationMethod'] != null ||
                    (_data!['nallaNeram'] as Map?)?['notes'] != null)
                  Card(
                    margin: const EdgeInsets.only(bottom: 12),
                    color: Theme.of(context).colorScheme.surfaceContainerHighest.withAlpha(70),
                    child: Padding(
                      padding: const EdgeInsets.all(12),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Calculation Info',
                            style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w800),
                          ),
                          const SizedBox(height: 4),
                          if ((_data!['nallaNeram'] as Map?)?['calculationMethod'] != null)
                            Text(
                              (_data!['nallaNeram'] as Map?)!['calculationMethod'],
                              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                    color: Theme.of(context).colorScheme.onSurface,
                                  ),
                            ),
                          if ((_data!['nallaNeram'] as Map?)?['notes'] != null) ...[
                            const SizedBox(height: 4),
                            Text(
                              (_data!['nallaNeram'] as Map?)!['notes'],
                              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                    fontStyle: FontStyle.italic,
                                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                                  ),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ),
                    ];
                  }(),
            ],
          ),
        ),
      ),
    );
  }
}
