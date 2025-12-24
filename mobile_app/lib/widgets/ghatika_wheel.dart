import 'dart:math';

import 'package:flutter/material.dart';

class YamGhatikaWheel extends StatelessWidget {
  const YamGhatikaWheel({
    super.key,
    required this.ghatikas,
    required this.onSelectNumber,
    this.selectedNumber,
  });

  final List<Map<String, dynamic>> ghatikas;
  final void Function(int number) onSelectNumber;
  final int? selectedNumber;

  @override
  Widget build(BuildContext context) {
    final selectedFill = Theme.of(context).colorScheme.primary.withAlpha(50);
    return GestureDetector(
      onTapDown: (d) {
        final box = context.findRenderObject() as RenderBox?;
        if (box == null) return;
        final local = box.globalToLocal(d.globalPosition);
        final size = box.size;
        final center = Offset(size.width / 2, size.height / 2);
        final v = local - center;

        final theta = atan2(v.dy, v.dx);
        const rot = -pi / 2;
        final t = (theta - rot + 2 * pi) % (2 * pi);

        final idx = (t / (2 * pi) * 8).floor().clamp(0, 7);
        final number = idx + 1;
        onSelectNumber(number);
      },
      child: CustomPaint(
        painter: _GhatikaPainter(
          ghatikas: ghatikas,
          selectedNumber: selectedNumber,
          selectedFill: selectedFill,
        ),
        child: const AspectRatio(aspectRatio: 1, child: SizedBox.expand()),
      ),
    );
  }
}

class _GhatikaPainter extends CustomPainter {
  _GhatikaPainter({required this.ghatikas, this.selectedNumber, required this.selectedFill});

  final List<Map<String, dynamic>> ghatikas;
  final int? selectedNumber;
  final Color selectedFill;

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = min(size.width, size.height) / 2;

    final base = Paint()..style = PaintingStyle.fill;
    final stroke = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2
      ..color = Colors.black12;

    final textPainter = TextPainter(textDirection: TextDirection.ltr);

    const rot = -pi / 2;
    const sweep = 2 * pi / 8;

    for (int i = 0; i < 8; i++) {
      final startAngle = rot + i * sweep;

      final g = ghatikas.isNotEmpty
          ? ghatikas.firstWhere(
              (x) => (x['number'] ?? (i + 1)) == (i + 1),
              orElse: () => {'isYamaganda': false},
            )
          : {'isYamaganda': false};

      final isYam = g['isYamaganda'] == true;
      final isSelected = selectedNumber == (i + 1);

      base.color = isSelected
          ? selectedFill
          : isYam
              ? Colors.black.withAlpha(70)
              : Colors.white;

      canvas.drawArc(Rect.fromCircle(center: center, radius: radius), startAngle, sweep, true, base);
      canvas.drawArc(Rect.fromCircle(center: center, radius: radius), startAngle, sweep, true, stroke);

      final labelAngle = startAngle + sweep / 2;
      final labelPos = center + Offset(cos(labelAngle), sin(labelAngle)) * (radius * 0.72);

      textPainter.text = TextSpan(
        text: '${i + 1}',
        style: TextStyle(
          fontSize: radius * 0.12,
          color: Colors.black,
          fontWeight: FontWeight.bold,
        ),
      );
      textPainter.layout();
      textPainter.paint(canvas, labelPos - Offset(textPainter.width / 2, textPainter.height / 2));
    }

    final titlePainter = TextPainter(textDirection: TextDirection.ltr);
    titlePainter.text = const TextSpan(
      text: '8 Ghatikas',
      style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold),
    );
    titlePainter.layout();
    titlePainter.paint(canvas, center - Offset(titlePainter.width / 2, titlePainter.height / 2));
  }

  @override
  bool shouldRepaint(covariant _GhatikaPainter oldDelegate) {
    return oldDelegate.ghatikas != ghatikas ||
        oldDelegate.selectedNumber != selectedNumber ||
        oldDelegate.selectedFill != selectedFill;
  }
}
