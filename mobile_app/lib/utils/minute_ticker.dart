import 'dart:async';

import 'package:flutter/foundation.dart';

class MinuteTicker {
  MinuteTicker() : nowLocal = ValueNotifier<DateTime>(DateTime.now()) {
    _start();
  }

  final ValueNotifier<DateTime> nowLocal;
  Timer? _timer;

  void _start() {
    _timer?.cancel();

    final localNow = DateTime.now();
    final nextMinute = DateTime(
      localNow.year,
      localNow.month,
      localNow.day,
      localNow.hour,
      localNow.minute,
    ).add(const Duration(minutes: 1));

    final initialDelay = nextMinute.difference(localNow);

    _timer = Timer(initialDelay, () {
      _tick();
      _timer = Timer.periodic(const Duration(minutes: 1), (_) => _tick());
    });
  }

  void _tick() {
    nowLocal.value = DateTime.now();
  }

  void dispose() {
    _timer?.cancel();
    nowLocal.dispose();
  }
}
