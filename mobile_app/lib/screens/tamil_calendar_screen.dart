import 'package:flutter/material.dart';
import '../services/api_client.dart';
import '../services/city_service.dart';
import '../services/tamil_calendar_service.dart';
import '../utils/time_window_lapse.dart';

class TamilCalendarScreen extends StatefulWidget {
  const TamilCalendarScreen({
    super.key,
    required this.cityListenable,
    required this.onViewTodayTimings,
  });

  final ValueNotifier<String> cityListenable;
  final VoidCallback onViewTodayTimings;

  @override
  State<TamilCalendarScreen> createState() => _TamilCalendarScreenState();
}

class _TamilCalendarScreenState extends State<TamilCalendarScreen> {
  List<String> _cities = const ['Chennai'];

  late final TamilCalendarService _service;
  late final CityService _cityService;

  int _year = DateTime.now().year;
  int _month = DateTime.now().month;

  Map<String, dynamic>? _data;
  Map<String, dynamic>? _cachedData;
  DateTime? _cachedAt;
  bool _stale = false;
  bool _loading = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    final client = ApiClient();
    _service = TamilCalendarService(client);
    _cityService = CityService(client);
    _loadCities();
    _fetch();

    widget.cityListenable.addListener(_onCityChanged);
  }

  @override
  void dispose() {
    widget.cityListenable.removeListener(_onCityChanged);
    super.dispose();
  }

  void _onCityChanged() {
    _fetch();
  }

  Future<void> _loadCities() async {
    try {
      final list = await _cityService.fetchCities();
      if (list.isNotEmpty) {
        setState(() => _cities = list);
      }
    } catch (_) {}
  }

  Future<void> _pickMonth() async {
    final picked = await showDatePicker(
      context: context,
      firstDate: DateTime(1900, 1, 1),
      lastDate: DateTime(2100, 12, 31),
      initialDate: DateTime(_year, _month, 1),
    );
    if (picked != null) {
      setState(() {
        _year = picked.year;
        _month = picked.month;
      });
      await _fetch();
    }
  }

  Future<void> _shiftMonth(int deltaMonths) async {
    final base = DateTime(_year, _month, 1);
    final next = DateTime(base.year, base.month + deltaMonths, 1);
    setState(() {
      _year = next.year;
      _month = next.month;
    });
    await _fetch();
  }

  Future<void> _fetch() async {
    setState(() {
      _loading = true;
      _error = null;
      _stale = false;
    });

    try {
      final res = await _service.fetchTamilCalendarMonth(
        year: _year,
        month: _month,
        city: widget.cityListenable.value,
      );
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

  void _showDayDetails(Map<String, dynamic> day) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (context) {
        return SafeArea(
          child: Padding(
            padding: EdgeInsets.only(
              left: 16,
              right: 16,
              top: 12,
              bottom: 16 + MediaQuery.of(context).viewInsets.bottom,
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        (day['date'] ?? 'Day details').toString(),
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                    ),
                    IconButton(
                      tooltip: 'Close',
                      onPressed: () => Navigator.of(context).pop(),
                      icon: const Icon(Icons.close),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Expanded(child: _TamilDayDetails(day: day, onViewTodayTimings: widget.onViewTodayTimings)),
              ],
            ),
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final tzOffset = (_data?['timezoneOffsetMinutes'] is int)
        ? (_data?['timezoneOffsetMinutes'] as int)
        : int.tryParse(_data?['timezoneOffsetMinutes']?.toString() ?? '') ?? 0;
    final todayStr = todayDateStrForOffsetMinutes(tzOffset);

    return Scaffold(
      body: RefreshIndicator(
        onRefresh: _fetch,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
          children: [
            Text('Tamil Calendar', style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w800)),
            const SizedBox(height: 12),
            LayoutBuilder(
              builder: (context, constraints) {
                final monthLabel = '$_year-${_month.toString().padLeft(2, '0')}';

                final monthControl = Row(
                  children: [
                    IconButton(
                      tooltip: 'Previous month',
                      onPressed: _loading ? null : () => _shiftMonth(-1),
                      icon: const Icon(Icons.chevron_left),
                    ),
                    Expanded(
                      child: OutlinedButton(
                        onPressed: _loading ? null : _pickMonth,
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(Icons.calendar_month),
                            const SizedBox(width: 8),
                            Flexible(
                              child: Text(
                                monthLabel,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                softWrap: false,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    IconButton(
                      tooltip: 'Next month',
                      onPressed: _loading ? null : () => _shiftMonth(1),
                      icon: const Icon(Icons.chevron_right),
                    ),
                  ],
                );

                final cityControl = ValueListenableBuilder<String>(
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
                );

                // Responsive: if space is tight, stack controls vertically.
                final isNarrow = constraints.maxWidth < 520;
                if (isNarrow) {
                  return Column(
                    children: [
                      monthControl,
                      const SizedBox(height: 12),
                      cityControl,
                    ],
                  );
                }

                return Row(
                  children: [
                    Expanded(child: monthControl),
                    const SizedBox(width: 12),
                    Expanded(child: cityControl),
                  ],
                );
              },
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
              if (_loading) const Center(child: CircularProgressIndicator()),
              if (!_loading && _data == null)
                const Center(child: Padding(padding: EdgeInsets.all(24), child: Text('No data yet'))),
              if (!_loading && _data != null) ...[
                if (_data!['monthLabel'] is Map)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: Text(
                      '${(_data!['monthLabel']['tamil'] ?? '-')} • ${(_data!['monthLabel']['english'] ?? '-')}',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
                    ),
                  ),
                _TamilCalendarWeeksTable(
                  year: _year,
                  month: _month,
                  weeks: _data!['weeks'],
                  todayDateStr: todayStr,
                  onTapDay: _showDayDetails,
                ),
              ],
          ],
        ),
      ),
    );
  }
}

class _TamilCalendarWeeksTable extends StatelessWidget {
  const _TamilCalendarWeeksTable({
    required this.year,
    required this.month,
    required this.weeks,
    required this.todayDateStr,
    required this.onTapDay,
  });

  final int year;
  final int month;
  final dynamic weeks;
  final String todayDateStr;
  final void Function(Map<String, dynamic> day) onTapDay;

  Map<String, Map<String, dynamic>> _indexDaysByDate(List weekList) {
    final map = <String, Map<String, dynamic>>{};
    for (final row in weekList) {
      if (row is! List) continue;
      for (final cell in row) {
        if (cell is! Map) continue;
        final day = cell.cast<String, dynamic>();
        final dateStr = day['date']?.toString();
        if (dateStr == null || dateStr.length < 10) continue;
        map[dateStr] = day;
      }
    }
    return map;
  }

  List<List<Map<String, dynamic>?>> _buildSundayFirstWeeks(List weekList) {
    final byDate = _indexDaysByDate(weekList);
    if (byDate.isEmpty) return const [];

    final first = DateTime(year, month, 1);
    final daysInMonth = DateTime(year, month + 1, 0).day;

    // Sunday-first: Sun=0..Sat=6
    final leadingBlanks = first.weekday % 7; // Mon=1..Sun=7 => Sun->0
    final cells = <Map<String, dynamic>?>[];

    for (int i = 0; i < leadingBlanks; i++) {
      cells.add(null);
    }

    for (int d = 1; d <= daysInMonth; d++) {
      final yyyy = year.toString().padLeft(4, '0');
      final mm = month.toString().padLeft(2, '0');
      final dd = d.toString().padLeft(2, '0');
      final key = '$yyyy-$mm-$dd';
      cells.add(byDate[key]);
    }

    while (cells.length % 7 != 0) {
      cells.add(null);
    }

    final out = <List<Map<String, dynamic>?>>[];
    for (int i = 0; i < cells.length; i += 7) {
      out.add(cells.sublist(i, i + 7));
    }
    return out;
  }

  @override
  Widget build(BuildContext context) {
    final weekList = (weeks is List) ? (weeks as List) : const [];

    // UI requirement: calendar grid is always Sunday-first like a usual calendar.
    // If the month starts on Monday, Sunday column stays empty.
    const headers = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

    final gridWeeks = _buildSundayFirstWeeks(weekList);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: List.generate(7, (i) {
            return Expanded(
              child: Center(
                child: Text(
                  headers[i],
                  style: Theme.of(context).textTheme.labelMedium,
                ),
              ),
            );
          }),
        ),
        const SizedBox(height: 8),
        Table(
          border: TableBorder.all(color: Theme.of(context).dividerColor),
          defaultVerticalAlignment: TableCellVerticalAlignment.middle,
          children: List<TableRow>.generate(gridWeeks.length, (weekIndex) {
            final cells = gridWeeks[weekIndex];

            final cellHeight = MediaQuery.sizeOf(context).width / 7;

            return TableRow(
              children: List<Widget>.generate(7, (dayIndex) {
                final cell = (dayIndex < cells.length) ? cells[dayIndex] : null;

                if (cell == null) {
                  return SizedBox(height: cellHeight);
                }

                final day = cell;
                final dateStr = day['date']?.toString();
                final isToday = (dateStr != null && dateStr == todayDateStr);
                final bg = isToday ? Theme.of(context).colorScheme.secondaryContainer : null;

                final gregorianDay = ((day['gregorian'] as Map?)?['day'])?.toString();
                final tamilDay = ((day['tamil'] as Map?)?['day'])?.toString();
                final tags = (day['tags'] is List) ? (day['tags'] as List) : const [];
                final hasTags = tags.isNotEmpty;

                return Material(
                  color: bg,
                  child: InkWell(
                    onTap: () => onTapDay(day),
                    child: SizedBox(
                      height: cellHeight,
                      child: LayoutBuilder(
                        builder: (context, constraints) {
                          final w = constraints.maxWidth;
                          final h = constraints.maxHeight;

                          final minSide = (w < h) ? w : h;
                          // Keep fully responsive: scale typography and spacing from the cell size.
                          final padX = w * 0.08;
                          final padY = h * 0.08;
                          final gSize = minSide * 0.40;
                          final tSize = minSide * 0.22;
                          final dotSize = minSide * 0.11;

                          return Padding(
                            padding: EdgeInsets.symmetric(horizontal: padX, vertical: padY),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                FittedBox(
                                  fit: BoxFit.scaleDown,
                                  alignment: Alignment.topLeft,
                                  child: Text(
                                    gregorianDay ?? '-',
                                    maxLines: 1,
                                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                          fontWeight: FontWeight.w900,
                                          fontSize: gSize,
                                        ),
                                  ),
                                ),
                                const Spacer(),
                                Row(
                                  children: [
                                    Expanded(
                                      child: FittedBox(
                                        fit: BoxFit.scaleDown,
                                        alignment: Alignment.bottomLeft,
                                        child: Text(
                                          tamilDay ?? '',
                                          maxLines: 1,
                                          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                                fontWeight: FontWeight.w700,
                                                fontSize: tSize,
                                                color: Theme.of(context).colorScheme.onSurfaceVariant,
                                              ),
                                        ),
                                      ),
                                    ),
                                    if (hasTags)
                                      Container(
                                        width: dotSize,
                                        height: dotSize,
                                        decoration: BoxDecoration(
                                          color: Theme.of(context).colorScheme.primary,
                                          shape: BoxShape.circle,
                                        ),
                                      ),
                                  ],
                                ),
                              ],
                            ),
                          );
                        },
                      ),
                    ),
                  ),
                );
              }),
            );
          }),
        ),
      ],
    );
  }
}

class _TamilDayDetails extends StatelessWidget {
  const _TamilDayDetails({required this.day, required this.onViewTodayTimings});

  final Map<String, dynamic> day;
  final VoidCallback onViewTodayTimings;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final p = (day['panchang'] is Map) ? (day['panchang'] as Map).cast<String, dynamic>() : const <String, dynamic>{};
    final tags = (day['tags'] is List) ? (day['tags'] as List) : const [];

    String lineFrom(Map<String, dynamic> m, String key) {
      final v = m[key];
      if (v is Map) {
        final name = v['name']?.toString();
        return name ?? v.toString();
      }
      return v?.toString() ?? '-';
    }

    return ListView(
      children: [
        Text('Panchang', style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w800)),
        const SizedBox(height: 8),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Tithi: ${lineFrom(p, 'tithi')}', style: theme.textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w700)),
                const SizedBox(height: 4),
                Text('Nakshatra: ${lineFrom(p, 'nakshatra')}', style: theme.textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w700)),
                const SizedBox(height: 4),
                Text('Yoga: ${lineFrom(p, 'yoga')}', style: theme.textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w700)),
                const SizedBox(height: 4),
                Text('Karana: ${lineFrom(p, 'karana')}', style: theme.textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w700)),
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),
        Text('Observances', style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w800)),
        const SizedBox(height: 8),
        if (tags.isEmpty)
          const Text('-')
        else
          Card(
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: List<Widget>.from(
                  tags.map((t) {
                    if (t is Map) {
                      final label = t['label']?.toString() ?? t.toString();
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 6),
                        child: Text(label, style: theme.textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w700)),
                      );
                    }
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 6),
                      child: Text(t.toString(), style: theme.textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w700)),
                    );
                  }),
                ),
              ),
            ),
          ),
        const SizedBox(height: 12),
        FilledButton(
          onPressed: () {
            Navigator.of(context).pop();
            onViewTodayTimings();
          },
          child: const Text('View today’s timings'),
        ),
      ],
    );
  }
}
