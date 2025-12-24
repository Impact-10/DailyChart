import 'package:flutter/material.dart';
import '../services/api_client.dart';
import '../services/chart_service.dart';
import '../services/city_service.dart';
import '../widgets/skeleton_loader.dart';
import '../widgets/rasi_chart_view.dart';

class RasiChartScreen extends StatefulWidget {
  const RasiChartScreen({super.key});

  @override
  State<RasiChartScreen> createState() => _RasiChartScreenState();
}

class _RasiChartScreenState extends State<RasiChartScreen> {
  final _dateCtrl = TextEditingController();
  final _timeCtrl = TextEditingController(text: '05:30');
  String _city = 'Chennai';
  List<String> _cities = const ['Chennai'];
  Map<String, dynamic>? _data;
  Map<String, dynamic>? _cachedData;
  DateTime? _cachedAt;
  bool _stale = false;
  bool _loading = false;
  String? _error;

  late final ChartService _service;
  late final CityService _cityService;

  @override
  void initState() {
    super.initState();
    _service = ChartService(ApiClient());
    _cityService = CityService(ApiClient());
    final now = DateTime.now();
    _dateCtrl.text = now.toIso8601String().split('T').first;
    _loadCities();
    _fetch(); // Auto-fetch on load
  }

  @override
  void dispose() {
    _dateCtrl.dispose();
    _timeCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadCities() async {
    try {
      final list = await _cityService.fetchCities();
      setState(() => _cities = list.isNotEmpty ? list : _cities);
    } catch (_) {
      // keep defaults silently
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
      final res = await _service.fetchDailyChart(
        date: _dateCtrl.text,
        time: _timeCtrl.text.isEmpty ? '05:30' : _timeCtrl.text,
        city: _city,
      );
      setState(() {
        _data = res;
        _cachedData = res;
        _cachedAt = DateTime.now();
        _stale = false;
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

  Widget _buildRasiChart(BuildContext context) {
    final rasiData = _data!['rasiData'] as Map<String, dynamic>?;
    if (rasiData == null) return const Text('No chart data');

    return RasiChartView(rasiData: rasiData);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Rasi Chart')),
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
                    child: TextField(
                      controller: _timeCtrl,
                      decoration: const InputDecoration(labelText: 'Time (HH:MM)'),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                initialValue: _city,
                items: _cities.map((c) => DropdownMenuItem(value: c, child: Text(c))).toList(),
                onChanged: (v) => setState(() => _city = v ?? 'Chennai'),
                decoration: const InputDecoration(labelText: 'City'),
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
              const SizedBox(height: 16),
              if (_loading)
                const SkeletonLoader(),
              if (!_loading && _data == null)
                const Center(child: Padding(padding: EdgeInsets.all(24), child: Text('No data yet'))),
              if (!_loading && _data != null) ...[
                Center(child: _buildRasiChart(context)),
                const SizedBox(height: 24),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

