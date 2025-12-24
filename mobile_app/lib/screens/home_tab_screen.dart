import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';

import '../services/api_client.dart';
import '../services/auspicious_service.dart';
import '../services/chart_service.dart';
import '../services/panchang_service.dart';
import '../utils/minute_ticker.dart';
import '../utils/time_window_lapse.dart';
import '../widgets/ghatika_wheel.dart';
import '../widgets/rasi_chart_view.dart';
import '../widgets/time_window_card.dart';

class HomeTabScreen extends StatefulWidget {
  const HomeTabScreen({super.key, required this.cityListenable});

  final ValueNotifier<String> cityListenable;

  @override
  State<HomeTabScreen> createState() => _HomeTabScreenState();
}

class _HomeTabScreenState extends State<HomeTabScreen> {
  static const _defaultTzOffsetMinutes = 330; // IST

  late final PanchangService _panchangService;
  late final AuspiciousService _auspiciousService;
  late final ChartService _chartService;
  late final MinuteTicker _ticker;

  Map<String, dynamic>? _panchang;
  Map<String, dynamic>? _auspicious;
  Map<String, dynamic>? _chart;

  bool _loading = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    final client = ApiClient();
    _panchangService = PanchangService(client);
    _auspiciousService = AuspiciousService(client);
    _chartService = ChartService(client);
    _ticker = MinuteTicker();

    widget.cityListenable.addListener(_onCityChange);
    _fetch();
  }

  @override
  void dispose() {
    widget.cityListenable.removeListener(_onCityChange);
    _ticker.dispose();
    super.dispose();
  }

  void _onCityChange() {
    _fetch();
  }

  Future<void> _fetch() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    final city = widget.cityListenable.value;

    // Use backend timezone offset for “today” so lapse comparisons are stable.
    final dateStr = todayDateStrForOffsetMinutes(_defaultTzOffsetMinutes);

    try {
      final results = await Future.wait<Map<String, dynamic>>([
        _panchangService.fetchPanchang(date: dateStr, city: city),
        _auspiciousService.fetchAuspiciousTimes(date: dateStr, city: city),
        _chartService.fetchDailyChart(date: dateStr, time: '05:30', city: city),
      ]);

      setState(() {
        _panchang = results[0];
        _auspicious = results[1];
        _chart = results[2];
      });
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      setState(() => _loading = false);
    }
  }

  int _tzOffsetMinutes() {
    final raw = _panchang?['timezoneOffsetMinutes'] ?? _auspicious?['timezoneOffsetMinutes'];
    if (raw is int) return raw;
    return int.tryParse(raw?.toString() ?? '') ?? _defaultTzOffsetMinutes;
  }

  String _dateStr() {
    return todayDateStrForOffsetMinutes(_tzOffsetMinutes());
  }

  _ActiveWindow? _pickCurrentOrNext(List<_ActiveWindow> candidates) {
    if (candidates.isEmpty) return null;

    final tzOffset = _tzOffsetMinutes();
    final dateStr = _dateStr();
    final nowLocal = _ticker.nowLocal.value;
    final nowUtc = nowLocal.toUtc();

    _ActiveWindow? bestCurrent;
    _ActiveWindow? bestNext;
    DateTime? bestNextStartUtc;

    for (final c in candidates) {
      final status = computeTimeWindowStatus(
        dateStr: dateStr,
        startText: c.startText,
        endText: c.endText,
        nowLocal: nowLocal,
        timezoneOffsetMinutes: tzOffset,
      );

      if (!status.isParsable || status.startUtc == null || status.endUtc == null) continue;

      if (status.isCurrent) {
        bestCurrent ??= c;
        continue;
      }

      if (!status.isPast) {
        final startUtc = status.startUtc!;
        if (startUtc.isAfter(nowUtc)) {
          if (bestNextStartUtc == null || startUtc.isBefore(bestNextStartUtc)) {
            bestNextStartUtc = startUtc;
            bestNext = c;
          }
        }
      }
    }

    return bestCurrent ?? bestNext;
  }

  List<_ActiveWindow> _computeTopWindows() {
    // Top cards should be: Nalla Neram, Rahu Kalam, and Yamagandam.
    // Do not show Gowri here (can coincide with Rahu and cause confusion).

    final picked = <_ActiveWindow>[];

    // 1) Nalla Neram: current if running, else next upcoming.
    final nn = ((_panchang?['nallaNeram'] as Map?)?['nallaNeram'] as List?) ?? const [];
    final nallaCandidates = <_ActiveWindow>[];
    for (final w in nn) {
      if (w is! Map) continue;
      final start = w['start']?.toString();
      final end = w['end']?.toString();
      if (start == null || end == null) continue;
      nallaCandidates.add(_ActiveWindow(title: 'Nalla Neram', subtitle: null, startText: start, endText: end));
    }
    final nallaPicked = _pickCurrentOrNext(nallaCandidates);
    if (nallaPicked != null) picked.add(nallaPicked);

    // 2) Rahu Kalam: show if current or upcoming.
    final rahu = _panchang?['rahuKaal'];
    if (rahu is Map) {
      final start = rahu['startTime']?.toString();
      final end = rahu['endTime']?.toString();
      if (start != null && end != null) {
        picked.add(_ActiveWindow(title: 'Rahu Kalam', subtitle: null, startText: start, endText: end));
      }
    }

    // 3) Yamagandam: if two windows exist, show the current one; otherwise show the next upcoming one.
    final yam = _panchang?['yamaganda'];
    if (yam is Map) {
      final candidates = <_ActiveWindow>[];

      final dayPeriod = yam['dayPeriod'];
      if (dayPeriod is Map) {
        final start = dayPeriod['startTime']?.toString();
        final end = dayPeriod['endTime']?.toString();
        if (start != null && end != null) {
          candidates.add(_ActiveWindow(title: 'Yamagandam (day)', subtitle: null, startText: start, endText: end));
        }
      }

      final nightPeriod = yam['nightPeriod'];
      if (nightPeriod is Map) {
        final start = nightPeriod['startTime']?.toString();
        final end = nightPeriod['endTime']?.toString();
        if (start != null && end != null) {
          candidates.add(_ActiveWindow(title: 'Yamagandam (night)', subtitle: null, startText: start, endText: end));
        }
      }

      final yamPicked = _pickCurrentOrNext(candidates);
      if (yamPicked != null) picked.add(yamPicked);
    }

    return picked;
  }

  @override
  Widget build(BuildContext context) {
    final tzOffset = _tzOffsetMinutes();
    final dateStr = _dateStr();
    final topWindows = _computeTopWindows();

    return RefreshIndicator(
      onRefresh: _fetch,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
        children: [
          // TOP: Current lapse hero (mandatory)
          if (topWindows.isEmpty)
            Card(
              margin: const EdgeInsets.only(bottom: 12),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Text(
                  'No active time window right now',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
                ),
              ),
            )
          else
            for (final w in topWindows)
              _TopTimingCard(
                title: w.title,
                subtitle: w.subtitle,
                dateStr: dateStr,
                startText: w.startText,
                endText: w.endText,
                nowLocal: _ticker.nowLocal,
                timezoneOffsetMinutes: tzOffset,
              ),

          // Section 2: Sun status (clean)
          _SunStatusSection(
            sunrise: _auspicious?['sunrise']?.toString(),
            sunset: _auspicious?['sunset']?.toString(),
            timezoneOffsetMinutes: tzOffset,
            dateStr: dateStr,
          ),

          const SizedBox(height: 12),

          // Section 3: Rasi chart
          if (_chart?['rasiData'] is Map)
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Rasi Chart', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800)),
                const SizedBox(height: 8),
                RasiChartView(rasiData: (_chart!['rasiData'] as Map).cast<String, dynamic>()),
              ],
            ),

          const SizedBox(height: 16),

          // Section 4: Today’s time windows
          Text('Today’s Time Windows', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800)),
          const SizedBox(height: 8),

          _TimeWindowsSection(
            title: 'Nalla Neram',
            windows: ((_panchang?['nallaNeram'] as Map?)?['nallaNeram'] as List?) ?? const [],
            kind: _WindowKind.nallaNeram,
            dateStr: dateStr,
            nowLocal: _ticker.nowLocal,
            timezoneOffsetMinutes: tzOffset,
          ),
          _TimeWindowsSection(
            title: 'Gowri Nalla Neram',
            windows: ((_panchang?['nallaNeram'] as Map?)?['gowriNallaNeram'] as List?) ?? const [],
            kind: _WindowKind.gowri,
            dateStr: dateStr,
            nowLocal: _ticker.nowLocal,
            timezoneOffsetMinutes: tzOffset,
          ),
          _RahuYamBlock(
            panchang: _panchang,
            dateStr: dateStr,
            nowLocal: _ticker.nowLocal,
            timezoneOffsetMinutes: tzOffset,
          ),

          if (_loading) const Padding(padding: EdgeInsets.only(top: 16), child: Center(child: CircularProgressIndicator())),
          if (_error != null)
            Padding(
              padding: const EdgeInsets.only(top: 12),
              child: Text(_error!, style: const TextStyle(color: Colors.red)),
            ),
        ],
      ),
    );
  }
}

class _ActiveWindow {
  _ActiveWindow({required this.title, required this.subtitle, required this.startText, required this.endText});

  final String title;
  final String? subtitle;
  final String startText;
  final String endText;
}

class _TopTimingCard extends StatelessWidget {
  const _TopTimingCard({
    required this.title,
    required this.dateStr,
    required this.startText,
    required this.endText,
    required this.nowLocal,
    required this.timezoneOffsetMinutes,
    this.subtitle,
  });

  final String title;
  final String dateStr;
  final String startText;
  final String endText;
  final ValueListenable<DateTime> nowLocal;
  final int timezoneOffsetMinutes;
  final String? subtitle;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return ValueListenableBuilder<DateTime>(
      valueListenable: nowLocal,
      builder: (context, now, _) {
        final status = computeTimeWindowStatus(
          dateStr: dateStr,
          startText: startText,
          endText: endText,
          nowLocal: now,
          timezoneOffsetMinutes: timezoneOffsetMinutes,
        );

        final barBg = theme.colorScheme.surfaceContainerHighest;
        final barFg = theme.colorScheme.primary;

        Widget? headerLine;
        int? pct;

        if (status.isCurrent) {
          pct = (status.progress * 100).round();
          headerLine = Text(
            '${status.elapsed.inMinutes} min elapsed  •  ${status.remaining.inMinutes} min left',
            style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
          );
        } else if (status.isPast && status.isParsable) {
          pct = 100;
          headerLine = Text(
            'Completed',
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w700,
              color: theme.colorScheme.onSurfaceVariant,
            ),
          );
        } else if (status.isParsable && status.startUtc != null) {
          final mins = status.startUtc!.difference(now.toUtc()).inMinutes;
          final safe = mins < 0 ? 0 : mins;
          headerLine = Text(
            safe == 0 ? 'Starting soon' : 'Starts in ${formatDurationMinutes(safe)}',
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w700,
              color: theme.colorScheme.onSurfaceVariant,
            ),
          );
        }

        return Card(
          margin: const EdgeInsets.only(bottom: 12),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800)),
                if (subtitle != null) ...[
                  const SizedBox(height: 2),
                  Text(subtitle!, style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant)),
                ],
                const SizedBox(height: 10),
                if (pct != null) ...[
                  ClipRRect(
                    borderRadius: BorderRadius.circular(10),
                    child: Container(
                      height: 14,
                      color: barBg,
                      child: Align(
                        alignment: Alignment.centerLeft,
                        child: FractionallySizedBox(
                          widthFactor: pct == 100 ? 1 : status.progress,
                          child: Container(color: barFg),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 10),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text('$pct%', style: theme.textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.w800)),
                      const SizedBox(width: 10),
                      if (headerLine != null) Expanded(child: headerLine),
                    ],
                  ),
                ] else if (headerLine != null) ...[
                  headerLine,
                ],
                const SizedBox(height: 8),
                Text(
                  '$startText → $endText',
                  style: theme.textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w600),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

class _SunStatusSection extends StatelessWidget {
  const _SunStatusSection({
    required this.sunrise,
    required this.sunset,
    required this.timezoneOffsetMinutes,
    required this.dateStr,
  });

  final String? sunrise;
  final String? sunset;
  final int timezoneOffsetMinutes;
  final String dateStr;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    String? duration;
    if (sunrise != null && sunset != null) {
      final sr = tryParseMinutes(sunrise!);
      final ss = tryParseMinutes(sunset!);
      if (sr != null && ss != null) {
        var mins = ss - sr;
        if (mins < 0) mins += 24 * 60;
        duration = formatDurationMinutes(mins);
      }
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Sun Status', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800)),
        const SizedBox(height: 8),
        Row(
          children: [
            Expanded(
              child: _SunRow(icon: Icons.wb_twilight, label: 'Sunrise', value: sunrise ?? '-'),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _SunRow(icon: Icons.nights_stay, label: 'Sunset', value: sunset ?? '-'),
            ),
          ],
        ),
        const SizedBox(height: 8),
        _SunRow(icon: Icons.timelapse, label: 'Day duration', value: duration ?? '-'),
      ],
    );
  }
}

class _SunRow extends StatelessWidget {
  const _SunRow({required this.icon, required this.label, required this.value});

  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Row(
      children: [
        Icon(icon, size: 18, color: theme.colorScheme.onSurfaceVariant),
        const SizedBox(width: 8),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: theme.textTheme.labelMedium?.copyWith(color: theme.colorScheme.onSurfaceVariant)),
              const SizedBox(height: 2),
              Text(value, style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700)),
            ],
          ),
        ),
      ],
    );
  }
}

enum _WindowKind { nallaNeram, gowri }

class _TimeWindowsSection extends StatefulWidget {
  const _TimeWindowsSection({
    required this.title,
    required this.windows,
    required this.kind,
    required this.dateStr,
    required this.nowLocal,
    required this.timezoneOffsetMinutes,
  });

  final String title;
  final List windows;
  final _WindowKind kind;
  final String dateStr;
  final ValueListenable<DateTime> nowLocal;
  final int timezoneOffsetMinutes;

  @override
  State<_TimeWindowsSection> createState() => _TimeWindowsSectionState();
}

class _TimeWindowsSectionState extends State<_TimeWindowsSection> {
  bool _expanded = false;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    // UX: Gowri has many slots; collapse by default but preserve order.
    final bool isCollapsible = widget.kind == _WindowKind.gowri;
    const int collapsedCount = 2;

    final int total = widget.windows.length;
    final int shown = (!isCollapsible || _expanded) ? total : (total < collapsedCount ? total : collapsedCount);

    return Padding(
      padding: const EdgeInsets.only(top: 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(child: Text(widget.title, style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w800))),
              if (isCollapsible && total > collapsedCount)
                TextButton(
                  onPressed: () => setState(() => _expanded = !_expanded),
                  child: Text(_expanded ? 'View less' : 'View all'),
                ),
            ],
          ),
          const SizedBox(height: 8),
          if (widget.windows.isEmpty)
            Text('-', style: theme.textTheme.bodyMedium)
          else
            ...List<Widget>.generate(shown, (i) {
              final w = widget.windows[i];
              if (w is! Map) {
                return Card(
                  margin: const EdgeInsets.only(bottom: 10),
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Text(w.toString()),
                  ),
                );
              }

              final start = w['start']?.toString();
              final end = w['end']?.toString();
              final label = w['label']?.toString();

              if (start != null && end != null) {
                final rawLabel = (label != null && label.trim().isNotEmpty) ? label.trim() : null;
                return TimeWindowCard(
                  title: widget.kind == _WindowKind.gowri ? 'Gowri Nalla Neram' : 'Nalla Neram',
                  dateStr: widget.dateStr,
                  startText: start,
                  endText: end,
                  nowLocal: widget.nowLocal,
                  timezoneOffsetMinutes: widget.timezoneOffsetMinutes,
                  emphasis: widget.kind == _WindowKind.nallaNeram,
                  metaLines: rawLabel == null
                      ? const []
                      : [widget.kind == _WindowKind.gowri ? 'Quality: $rawLabel' : rawLabel],
                );
              }

              return Card(
                margin: const EdgeInsets.only(bottom: 10),
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Text('-', style: theme.textTheme.bodyMedium),
                ),
              );
            }),
          if (isCollapsible && !_expanded && total > shown)
            Padding(
              padding: const EdgeInsets.only(top: 2),
              child: Text(
                'Showing $shown of $total',
                style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant),
              ),
            ),
        ],
      ),
    );
  }
}

class _RahuYamBlock extends StatefulWidget {
  const _RahuYamBlock({
    required this.panchang,
    required this.dateStr,
    required this.nowLocal,
    required this.timezoneOffsetMinutes,
  });

  final Map<String, dynamic>? panchang;
  final String dateStr;
  final ValueListenable<DateTime> nowLocal;
  final int timezoneOffsetMinutes;

  @override
  State<_RahuYamBlock> createState() => _RahuYamBlockState();
}

class _RahuYamBlockState extends State<_RahuYamBlock> {
  int? _selectedDayGhatikaNumber;
  int? _selectedNightGhatikaNumber;
  bool _showNightWheel = false;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    int? intFrom(dynamic v) => v is int ? v : int.tryParse(v?.toString() ?? '');

    List<Map<String, dynamic>> castGhatikas(dynamic raw) {
      if (raw is! List) return const [];
      return raw.whereType<Map>().map((e) => e.cast<String, dynamic>()).toList(growable: false);
    }

    final rahu = widget.panchang?['rahuKaal'];
    final String? rahuStart = (rahu is Map) ? rahu['startTime']?.toString() : null;
    final String? rahuEnd = (rahu is Map) ? rahu['endTime']?.toString() : null;

    final yam = widget.panchang?['yamaganda'];
    final dp = (yam is Map) ? yam['dayPeriod'] : null;
    final np = (yam is Map) ? yam['nightPeriod'] : null;

    final String? yamDayStart = (dp is Map) ? dp['startTime']?.toString() : null;
    final String? yamDayEnd = (dp is Map) ? dp['endTime']?.toString() : null;
    final int? activeDayGhatika = (dp is Map) ? intFrom(dp['activeGhatika']) : null;
    final List<Map<String, dynamic>> dayGhatikas = (dp is Map) ? castGhatikas(dp['ghatikas']) : const [];

    final String? yamNightStart = (np is Map) ? np['startTime']?.toString() : null;
    final String? yamNightEnd = (np is Map) ? np['endTime']?.toString() : null;
    final int? activeNightGhatika = (np is Map) ? intFrom(np['activeGhatika']) : null;
    final List<Map<String, dynamic>> nightGhatikas = (np is Map) ? castGhatikas(np['ghatikas']) : const [];

    // Kuligai is not returned by the current backend payload.
    final kuligaiRaw = widget.panchang?['kuligai'];

    final bool hasNightGhatikas = nightGhatikas.isNotEmpty;
    if (!hasNightGhatikas && _showNightWheel) {
      _showNightWheel = false;
    }

    final List<Map<String, dynamic>> wheelGhatikas = _showNightWheel ? nightGhatikas : dayGhatikas;
    final int? selectedWheelNumber = _showNightWheel
        ? (_selectedNightGhatikaNumber ?? activeNightGhatika)
        : (_selectedDayGhatikaNumber ?? activeDayGhatika);

    return Padding(
      padding: const EdgeInsets.only(top: 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Rahu / Yamagandam', style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w800)),
          const SizedBox(height: 8),

          if (rahuStart != null && rahuEnd != null)
            TimeWindowCard(
              title: 'Rahu Kalam',
              dateStr: widget.dateStr,
              startText: rahuStart,
              endText: rahuEnd,
              nowLocal: widget.nowLocal,
              timezoneOffsetMinutes: widget.timezoneOffsetMinutes,
              emphasis: true,
            )
          else
            Card(
              margin: const EdgeInsets.only(bottom: 10),
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Text('Rahu Kalam: ${rahu?.toString() ?? '-'}'),
              ),
            ),

          if (yamDayStart != null && yamDayEnd != null)
            TimeWindowCard(
              title: 'Yamagandam (day)',
              dateStr: widget.dateStr,
              startText: yamDayStart,
              endText: yamDayEnd,
              nowLocal: widget.nowLocal,
              timezoneOffsetMinutes: widget.timezoneOffsetMinutes,
              emphasis: true,
              metaLines: activeDayGhatika != null ? ['Day ghatika #$activeDayGhatika'] : const [],
            )
          else
            Card(
              margin: const EdgeInsets.only(bottom: 10),
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Text('Yamagandam (day): ${dp?.toString() ?? '-'}'),
              ),
            ),

          if (yamNightStart != null && yamNightEnd != null)
            TimeWindowCard(
              title: 'Yamagandam (night)',
              dateStr: widget.dateStr,
              startText: yamNightStart,
              endText: yamNightEnd,
              nowLocal: widget.nowLocal,
              timezoneOffsetMinutes: widget.timezoneOffsetMinutes,
              emphasis: true,
              metaLines: activeNightGhatika != null ? ['Night ghatika #$activeNightGhatika'] : const [],
            ),

          Card(
            margin: const EdgeInsets.only(bottom: 10),
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Kuligai', style: theme.textTheme.labelLarge?.copyWith(fontWeight: FontWeight.w700)),
                  const SizedBox(height: 4),
                  Text(
                    kuligaiRaw?.toString() ?? 'Not provided by current API payload',
                    style: theme.textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w600),
                  ),
                ],
              ),
            ),
          ),

          if (wheelGhatikas.isNotEmpty)
            Card(
              margin: const EdgeInsets.only(bottom: 10),
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            '8 Ghatikas (${_showNightWheel ? 'Night' : 'Day'})',
                            style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w800),
                          ),
                        ),
                        if (hasNightGhatikas)
                          TextButton(
                            onPressed: () => setState(() => _showNightWheel = !_showNightWheel),
                            child: Text(_showNightWheel ? 'Show day' : 'Show night'),
                          ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    SizedBox(
                      height: 220,
                      child: YamGhatikaWheel(
                        ghatikas: wheelGhatikas,
                        selectedNumber: selectedWheelNumber,
                        onSelectNumber: (n) => setState(() {
                          if (_showNightWheel) {
                            _selectedNightGhatikaNumber = n;
                          } else {
                            _selectedDayGhatikaNumber = n;
                          }
                        }),
                      ),
                    ),
                    if (selectedWheelNumber != null) ...[
                      const SizedBox(height: 10),
                      _SelectedGhatikaDetails(ghatikas: wheelGhatikas, number: selectedWheelNumber),
                    ],
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _SelectedGhatikaDetails extends StatelessWidget {
  const _SelectedGhatikaDetails({required this.ghatikas, required this.number});

  final List<Map<String, dynamic>> ghatikas;
  final int number;

  @override
  Widget build(BuildContext context) {
    final item = ghatikas.firstWhere(
      (x) => (x['number'] ?? -1) == number,
      orElse: () => const <String, dynamic>{},
    );

    final isYam = item['isYamaganda'] == true;
    final start = item['startTime']?.toString() ?? '-';
    final end = item['endTime']?.toString() ?? '-';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Ghatika #$number', style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w800)),
        const SizedBox(height: 4),
        Text('$start → $end', style: Theme.of(context).textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w700)),
        const SizedBox(height: 2),
        Text(isYam ? 'Yamagandam ghatika' : 'Normal ghatika', style: Theme.of(context).textTheme.bodySmall),
      ],
    );
  }
}
