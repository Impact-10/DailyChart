import 'package:flutter/material.dart';
import 'home_tab_screen.dart';
import 'tamil_calendar_screen.dart';
import 'settings_screen.dart';

import '../app_strings.dart';
import '../widgets/language_toggle.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _index = 0;

  final ValueNotifier<String> _city = ValueNotifier<String>('Chennai');

  @override
  void initState() {
    super.initState();
  }

  @override
  void dispose() {
    _city.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final s = S.of(context);

    final pages = [
      HomeTabScreen(cityListenable: _city),
      TamilCalendarScreen(
        cityListenable: _city,
        onViewTodayTimings: () => setState(() => _index = 0),
      ),
      SettingsScreen(cityListenable: _city),
    ];

    String titleForIndex() {
      switch (_index) {
        case 0:
          return s.navHome;
        case 1:
          return s.navTamilCalendar;
        case 2:
          return s.navSettings;
      }
      return s.appTitle;
    }

    return Scaffold(
      appBar: AppBar(
        title: Text(titleForIndex()),
        actions: const [
          Padding(
            padding: EdgeInsets.only(right: 12),
            child: Center(child: LanguageToggle()),
          ),
        ],
      ),
      body: SafeArea(
        top: false,
        child: IndexedStack(index: _index, children: pages),
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (i) => setState(() => _index = i),
        destinations: [
          NavigationDestination(icon: const Icon(Icons.home), label: s.navHome),
          NavigationDestination(icon: const Icon(Icons.calendar_month), label: s.navTamilCalendar),
          NavigationDestination(icon: const Icon(Icons.settings), label: s.navSettings),
        ],
      ),
    );
  }
}
