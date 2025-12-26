import 'package:flutter/widgets.dart';
import 'app_language.dart';

class S {
  const S(this.lang);

  final AppLanguage lang;

  static S of(BuildContext context) => S(AppLanguageScope.of(context));

  bool get isTamil => lang == AppLanguage.tamil;

  String get appTitle => isTamil ? 'டாக்ஷா ஜோதிடம்' : 'Daily Chart';

  String get navHome => isTamil ? 'முகப்பு' : 'Home';
  String get navTamilCalendar => isTamil ? 'தமிழ் காலண்டர்' : 'Tamil Calendar';
  String get navSettings => isTamil ? 'அமைப்புகள்' : 'Settings';

  String get settingsTitle => navSettings;
  String get settingsCity => isTamil ? 'நகரம்' : 'City';
  String get settingsTimeFormat => isTamil ? 'நேர வடிவம்' : 'Time format';
  String get settingsTime24h => isTamil ? '24 மணி' : '24-hour';
  String get settingsTime12h => isTamil ? '12 மணி' : '12-hour';
  String get settingsTimeNote => isTamil
      ? 'சர்வரில் வரும் நேரக் குறிப்புகள் மாற்றமின்றி காட்டப்படும்.'
      : 'Backend-provided time strings are displayed as-is.';
  String get settingsAbout => isTamil ? 'பற்றி' : 'About';
  String get settingsCalcNotes => isTamil ? 'கணக்கீட்டு குறிப்புகள்' : 'Calculation notes';
  String get settingsCalcBody => isTamil
      ? 'இந்த ஆப் சர்வர் கணக்கிட்ட மதிப்புகளை காட்டுகிறது. பட்டியல்கள் கிளையன்ட் பக்க மாற்றம்/வரிசைமாற்றம் இல்லாமல் காட்டப்படும்.\n'
        'லாப்ஸ் (progress) குறியீடுகள் காட்சி மட்டுமே; ஒப்பிடுவதற்கு சர்வர் timezone offset பயன்படுத்தப்படும்.'
      : 'This app displays server-calculated values. Lists are rendered without client-side filtering or reordering.\n'
        'Lapse indicators are display-only and use the server timezone offset for comparisons.';

  String get tamilCalendarTitle => navTamilCalendar;
  String get close => isTamil ? 'மூடு' : 'Close';
  String get dayDetailsFallback => isTamil ? 'நாள் விவரம்' : 'Day details';
  String get showingCachedData => isTamil ? 'கேஷ் தரவு காட்டப்படுகிறது' : 'Showing cached data';
  String get noDataYet => isTamil ? 'இன்னும் தரவு இல்லை' : 'No data yet';
  String get prevMonth => isTamil ? 'முந்தைய மாதம்' : 'Previous month';
  String get nextMonth => isTamil ? 'அடுத்த மாதம்' : 'Next month';

  // Home tab (top windows)
  String get nallaNeram => isTamil ? 'நல்ல நேரம்' : 'Nalla Neram';
  String get rahuKalam => isTamil ? 'ராகு காலம்' : 'Rahu Kalam';
  String get yamagandamDay => isTamil ? 'யமகண்டம் (பகல்)' : 'Yamagandam (day)';
  String get yamagandamNight => isTamil ? 'யமகண்டம் (இரவு)' : 'Yamagandam (night)';
}
