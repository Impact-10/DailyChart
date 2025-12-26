import 'package:flutter/material.dart';

import '../app_language.dart';

class LanguageToggle extends StatelessWidget {
  const LanguageToggle({super.key});

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<AppLanguage>(
      valueListenable: AppLanguageController.current,
      builder: (context, lang, _) {
        return SegmentedButton<AppLanguage>(
          showSelectedIcon: false,
          segments: const [
            ButtonSegment(value: AppLanguage.english, label: Text('EN')),
            ButtonSegment(value: AppLanguage.tamil, label: Text('தமிழ்')),
          ],
          selected: <AppLanguage>{lang},
          onSelectionChanged: (set) {
            final selected = set.isEmpty ? AppLanguage.english : set.first;
            AppLanguageController.set(selected);
          },
        );
      },
    );
  }
}
