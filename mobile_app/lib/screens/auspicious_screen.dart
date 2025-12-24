import 'package:flutter/material.dart';

/// Legacy screen kept only to avoid breaking old routes during refactors.
/// The app’s current UX uses the 3-tab layout (Home / Tamil Calendar / Settings).
class AuspiciousScreen extends StatelessWidget {
  const AuspiciousScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Auspicious')),
      body: const Center(
        child: Padding(
          padding: EdgeInsets.all(16),
          child: Text('This screen is no longer used. See Home for timings.'),
        ),
      ),
    );
  }
}

