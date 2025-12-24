import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import '../utils/time_window_lapse.dart';

class TimeWindowCard extends StatelessWidget {
  const TimeWindowCard({
    super.key,
    required this.title,
    required this.dateStr,
    required this.startText,
    required this.endText,
    required this.nowLocal,
    required this.timezoneOffsetMinutes,
    this.metaLines = const [],
    this.emphasis = false,
    this.showLapse = true,
  });

  final String title;
  final String dateStr; // YYYY-MM-DD (used only to interpret start/end for lapse)
  final String startText; // render exactly
  final String endText; // render exactly
  final ValueListenable<DateTime> nowLocal;
  final int timezoneOffsetMinutes;
  final List<String> metaLines;
  final bool emphasis;
  final bool showLapse;

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

        final barColor = _progressColor(status.progress);

        final cardChild = Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (showLapse && status.isCurrent) ...[
                Row(
                  children: [
                    Expanded(
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(6),
                        child: Container(
                          height: emphasis ? 10 : 8,
                          color: theme.colorScheme.surfaceContainerHighest,
                          child: Align(
                            alignment: Alignment.centerLeft,
                            child: FractionallySizedBox(
                              widthFactor: status.progress,
                              child: Container(
                                color: barColor,
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Text('${(status.progress * 100).round()}%',
                        style: theme.textTheme.labelMedium?.copyWith(color: theme.colorScheme.onSurfaceVariant)),
                  ],
                ),
                const SizedBox(height: 6),
                Text(
                  '${status.elapsed.inMinutes} min elapsed · ${status.remaining.inMinutes} min left',
                  style: theme.textTheme.labelLarge?.copyWith(
                    fontWeight: FontWeight.w600,
                    color: theme.colorScheme.onSurface,
                  ),
                ),
                const SizedBox(height: 10),
              ],
              Text(
                title,
                style: (emphasis ? theme.textTheme.titleMedium : theme.textTheme.titleSmall)
                    ?.copyWith(fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 6),
              Text(
                '$startText → $endText',
                style: theme.textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w600),
              ),
              if (metaLines.isNotEmpty) ...[
                const SizedBox(height: 6),
                for (final line in metaLines)
                  Padding(
                    padding: const EdgeInsets.only(top: 2),
                    child: Text(
                      line,
                      style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                    ),
                  ),
              ],
            ],
          ),
        );

        final child = Card(
          margin: const EdgeInsets.only(bottom: 12),
          child: cardChild,
        );

        if (status.isPast) {
          return Opacity(opacity: 0.5, child: child);
        }

        // Future or unparseable: normal card, no bar.
        return child;
      },
    );
  }

  static Color _progressColor(double progress) {
    // Premium/subtle: use softened Material colors (no flashing).
    if (progress <= 0.5) {
      return Colors.green.shade500.withAlpha(140);
    }
    if (progress <= 0.8) {
      return Colors.orange.shade500.withAlpha(140);
    }
    return Colors.red.shade500.withAlpha(128);
  }

  // Backend time parsing lives in utils/time_window_lapse.dart
}
