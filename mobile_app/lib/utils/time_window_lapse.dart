class TimeWindowStatus {
  TimeWindowStatus({
    required this.isParsable,
    required this.isCurrent,
    required this.isPast,
    required this.progress,
    required this.total,
    required this.elapsed,
    required this.remaining,
    required this.startUtc,
    required this.endUtc,
  });

  final bool isParsable;
  final bool isCurrent;
  final bool isPast;
  final double progress;
  final Duration total;
  final Duration elapsed;
  final Duration remaining;
  final DateTime? startUtc;
  final DateTime? endUtc;
}

TimeWindowStatus computeTimeWindowStatus({
  required String dateStr,
  required String startText,
  required String endText,
  required DateTime nowLocal,
  required int timezoneOffsetMinutes,
}) {
  final startUtc = tryParseBackendLocalToUtc(dateStr, startText, timezoneOffsetMinutes);
  var endUtc = tryParseBackendLocalToUtc(dateStr, endText, timezoneOffsetMinutes);

  if (startUtc != null && endUtc != null && !endUtc.isAfter(startUtc)) {
    endUtc = endUtc.add(const Duration(days: 1));
  }

    final nowUtc = nowLocal.toUtc();
    final start = startUtc;
    final end = endUtc;
    final isParsable = start != null && end != null;

    final isCurrent = isParsable &&
      (nowUtc.isAtSameMomentAs(start) || nowUtc.isAfter(start)) &&
      nowUtc.isBefore(end);
    final isPast = isParsable && (nowUtc.isAtSameMomentAs(end) || nowUtc.isAfter(end));

    final total = isParsable ? end.difference(start) : Duration.zero;
    final elapsed = isCurrent ? nowUtc.difference(start) : Duration.zero;
    final remaining = isCurrent ? end.difference(nowUtc) : Duration.zero;

  final progress = (isCurrent && total.inSeconds > 0)
      ? (elapsed.inSeconds / total.inSeconds).clamp(0.0, 1.0)
      : 0.0;

  return TimeWindowStatus(
    isParsable: isParsable,
    isCurrent: isCurrent,
    isPast: isPast,
    progress: progress,
    total: total,
    elapsed: elapsed,
    remaining: remaining,
    startUtc: startUtc,
    endUtc: endUtc,
  );
}

DateTime? tryParseBackendLocalToUtc(String dateStr, String timeText, int offsetMinutes) {
  final minutes = tryParseMinutes(timeText);
  if (minutes == null) return null;

  final parts = dateStr.split('-').map(int.tryParse).toList(growable: false);
  if (parts.length != 3 || parts.any((x) => x == null)) return null;

  final year = parts[0]!;
  final month = parts[1]!;
  final day = parts[2]!;

  final hh = minutes ~/ 60;
  final mm = minutes % 60;

  // Treat given time as a backend-timezone wall-clock time.
  // Convert to UTC for timezone-robust comparisons against now.
  // Display still uses backend strings unchanged.
  return DateTime.utc(year, month, day, hh, mm).subtract(Duration(minutes: offsetMinutes));
}

int? tryParseMinutes(String input) {
  final s = input.trim();

  // Matches "h:mm AM" / "hh:mmPM" etc.
  final m = RegExp(r'^(\d{1,2}):(\d{2})\s*([AaPp][Mm])$').firstMatch(s);
  if (m != null) {
    final hour = int.tryParse(m.group(1)!);
    final minute = int.tryParse(m.group(2)!);
    final ampm = m.group(3)!.toUpperCase();
    if (hour == null || minute == null) return null;
    if (hour < 1 || hour > 12 || minute < 0 || minute > 59) return null;

    var h = hour % 12;
    if (ampm == 'PM') h += 12;
    return h * 60 + minute;
  }

  // Matches 24h "HH:MM".
  final m24 = RegExp(r'^(\d{1,2}):(\d{2})$').firstMatch(s);
  if (m24 != null) {
    final hour = int.tryParse(m24.group(1)!);
    final minute = int.tryParse(m24.group(2)!);
    if (hour == null || minute == null) return null;
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
    return hour * 60 + minute;
  }

  return null;
}

String formatDurationMinutes(int totalMinutes) {
  final h = totalMinutes ~/ 60;
  final m = totalMinutes % 60;
  if (h <= 0) return '${m}m';
  if (m == 0) return '${h}h';
  return '${h}h ${m}m';
}

String todayDateStrForOffsetMinutes(int offsetMinutes, {DateTime? nowUtc}) {
  final utc = (nowUtc ?? DateTime.now().toUtc());
  final inZone = utc.add(Duration(minutes: offsetMinutes));
  final yyyy = inZone.year.toString().padLeft(4, '0');
  final mm = inZone.month.toString().padLeft(2, '0');
  final dd = inZone.day.toString().padLeft(2, '0');
  return '$yyyy-$mm-$dd';
}

bool isWindowActiveNow({
  required String dateStr,
  required String startText,
  required String endText,
  required DateTime nowLocal,
  required int timezoneOffsetMinutes,
}) {
  return computeTimeWindowStatus(
    dateStr: dateStr,
    startText: startText,
    endText: endText,
    nowLocal: nowLocal,
    timezoneOffsetMinutes: timezoneOffsetMinutes,
  ).isCurrent;
}
