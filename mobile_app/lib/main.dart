import 'package:flutter/material.dart';
import 'screens/home_screen.dart';
import 'screens/splash_screen.dart';

import 'app_language.dart';

void main() {
  runApp(const DailyChartApp());
}

class DailyChartApp extends StatelessWidget {
  const DailyChartApp({super.key, this.skipSplash = false});

  final bool skipSplash;

  @override
  Widget build(BuildContext context) {
    // Brighter professional palette (clean daylight feel).
    // Keep it simple: light background/surfaces + one accent for buttons/highlights.
    const bg = Color(0xFFFFFFFF); // background
    const surface = Color(0xFFFFFFFF); // cards/sheets
    const text = Color(0xFF111827); // primary text
    const accent = Color(0xFF2563EB); // accent (buttons/highlights)

    // Use fromSeed so Material3 derives a cohesive, modern palette.
    final scheme = ColorScheme.fromSeed(
      seedColor: accent,
      brightness: Brightness.light,
    ).copyWith(
      surface: surface,
      onSurface: text,
      surfaceContainerHighest: const Color(0xFFF3F4F6),
      onSurfaceVariant: const Color(0xFF6B7280),
      outline: const Color(0xFFE5E7EB),
    );

    return MaterialApp(
      title: 'Daily Transit Chart',
      theme: ThemeData(
        colorScheme: scheme,
        useMaterial3: true,
        scaffoldBackgroundColor: bg,
        appBarTheme: const AppBarTheme(
          backgroundColor: bg,
          foregroundColor: text,
          surfaceTintColor: Colors.transparent,
          elevation: 0,
        ),
        cardTheme: const CardThemeData(
          color: surface,
          surfaceTintColor: Colors.transparent,
          margin: EdgeInsets.zero,
        ),
        navigationBarTheme: NavigationBarThemeData(
          backgroundColor: surface,
          surfaceTintColor: Colors.transparent,
          indicatorColor: scheme.primary.withAlpha(24),
        ),
        textTheme: const TextTheme(
          headlineMedium: TextStyle(fontWeight: FontWeight.w700),
          titleMedium: TextStyle(fontWeight: FontWeight.w600),
        ),
      ),
      builder: (context, child) {
        return AppLanguageScope(
          notifier: AppLanguageController.current,
          child: child ?? const SizedBox.shrink(),
        );
      },
      home: skipSplash ? const HomeScreen() : const SplashScreen(next: HomeScreen()),
    );
  }
}
