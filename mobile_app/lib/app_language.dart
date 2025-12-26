import 'package:flutter/widgets.dart';
import 'package:shared_preferences/shared_preferences.dart';

enum AppLanguage {
  english,
  tamil,
}

class AppLanguageController {
  static const _prefsKey = 'app_language';

  static final ValueNotifier<AppLanguage> current = ValueNotifier<AppLanguage>(AppLanguage.english);

  static Future<void> load() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString(_prefsKey);
      current.value = raw == 'ta' ? AppLanguage.tamil : AppLanguage.english;
    } catch (_) {
      current.value = AppLanguage.english;
    }
  }

  static Future<void> set(AppLanguage lang) async {
    if (current.value == lang) return;
    current.value = lang;
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_prefsKey, lang == AppLanguage.tamil ? 'ta' : 'en');
    } catch (_) {}
  }
}

class AppLanguageScope extends InheritedNotifier<ValueNotifier<AppLanguage>> {
  const AppLanguageScope({
    super.key,
    required super.notifier,
    required super.child,
  });

  static AppLanguage of(BuildContext context) {
    final scope = context.dependOnInheritedWidgetOfExactType<AppLanguageScope>();
    return scope?.notifier?.value ?? AppLanguage.english;
  }
}
