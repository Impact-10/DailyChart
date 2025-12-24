import 'package:flutter/material.dart';

/// Reusable skeleton loading widget for all screens
class SkeletonLoader extends StatelessWidget {
  final int lineCount;
  final EdgeInsets padding;

  const SkeletonLoader({
    super.key,
    this.lineCount = 4,
    this.padding = const EdgeInsets.symmetric(vertical: 6),
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: List.generate(
        lineCount,
        (i) => Padding(
          padding: padding,
          child: Container(
            height: 16,
            width: double.infinity,
            decoration: BoxDecoration(
              color: Colors.grey.shade300,
              borderRadius: BorderRadius.circular(4),
            ),
          ),
        ),
      ),
    );
  }
}
