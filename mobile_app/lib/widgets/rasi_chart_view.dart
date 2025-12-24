import 'package:flutter/material.dart';

class RasiChartView extends StatelessWidget {
  const RasiChartView({super.key, required this.rasiData});

  final Map<String, dynamic> rasiData;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final chartSize = constraints.maxWidth;
        final cellSize = chartSize / 4;
        final fontSize = cellSize * 0.12;

        return AspectRatio(
          aspectRatio: 1,
          child: Container(
            decoration: BoxDecoration(
              border: Border.all(color: Theme.of(context).dividerColor, width: 1.5),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Column(
              children: [
                Expanded(
                  child: Row(
                    children: [
                      Expanded(child: _buildHouse(context, '11', fontSize)),
                      Expanded(child: _buildHouse(context, '0', fontSize)),
                      Expanded(child: _buildHouse(context, '1', fontSize)),
                      Expanded(child: _buildHouse(context, '2', fontSize)),
                    ],
                  ),
                ),
                Expanded(
                  flex: 2,
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          children: [
                            Expanded(child: _buildHouse(context, '10', fontSize)),
                            Expanded(child: _buildHouse(context, '9', fontSize)),
                          ],
                        ),
                      ),
                      Expanded(
                        flex: 2,
                        child: Container(
                          decoration: BoxDecoration(
                            color: Theme.of(context).colorScheme.surfaceContainer,
                            border: Border.all(color: Theme.of(context).dividerColor, width: 2),
                          ),
                          alignment: Alignment.center,
                          child: FittedBox(
                            fit: BoxFit.scaleDown,
                            child: Text(
                              'ராசி\nRASI',
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: cellSize * 0.28,
                                height: 1.2,
                                color: Theme.of(context).colorScheme.primary,
                              ),
                            ),
                          ),
                        ),
                      ),
                      Expanded(
                        child: Column(
                          children: [
                            Expanded(child: _buildHouse(context, '3', fontSize)),
                            Expanded(child: _buildHouse(context, '4', fontSize)),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                Expanded(
                  child: Row(
                    children: [
                      Expanded(child: _buildHouse(context, '8', fontSize)),
                      Expanded(child: _buildHouse(context, '7', fontSize)),
                      Expanded(child: _buildHouse(context, '6', fontSize)),
                      Expanded(child: _buildHouse(context, '5', fontSize)),
                    ],
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildHouse(BuildContext context, String houseNum, double fontSize) {
    final house = rasiData[houseNum] as Map<String, dynamic>?;
    final planets = (house?['planets'] as List?)?.cast<String>() ?? [];
    final isLagna = house?['isLagna'] == true;

    return Container(
      decoration: BoxDecoration(
        border: Border.all(color: Theme.of(context).dividerColor, width: 0.5),
        color: isLagna ? Theme.of(context).colorScheme.secondaryContainer : Theme.of(context).colorScheme.surface,
      ),
      padding: const EdgeInsets.all(2),
      child: Center(
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (isLagna)
                Text(
                  'L',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    color: Theme.of(context).colorScheme.error,
                    fontSize: fontSize + 1,
                  ),
                ),
              ...planets.map(
                (p) => Text(
                  p,
                  style: TextStyle(fontSize: fontSize),
                  textAlign: TextAlign.center,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
