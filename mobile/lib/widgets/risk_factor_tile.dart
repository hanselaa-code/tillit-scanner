import 'package:flutter/material.dart';
import '../models/analysis_result.dart';
import '../theme/app_theme.dart';

class RiskFactorTile extends StatelessWidget {
  final AssessmentFactor factor;
  final bool isPositive;

  const RiskFactorTile({
    super.key,
    required this.factor,
    this.isPositive = false,
  });

  @override
  Widget build(BuildContext context) {
    Color iconColor;
    Color bgColor;
    IconData icon;

    if (isPositive) {
      iconColor = AppTheme.safeGreen;
      bgColor = AppTheme.safeGreen.withValues(alpha: 0.12);
      icon = Icons.check_circle_outline_rounded;
    } else {
      switch (factor.severity) {
        case FactorSeverity.danger:
          iconColor = AppTheme.dangerRed;
          bgColor = AppTheme.dangerRed.withValues(alpha: 0.12);
          icon = Icons.error_outline_rounded;
          break;
        case FactorSeverity.warning:
          iconColor = AppTheme.warningAmber;
          bgColor = AppTheme.warningAmber.withValues(alpha: 0.12);
          icon = Icons.warning_amber_rounded;
          break;
        case FactorSeverity.info:
          iconColor = AppTheme.primaryBlue;
          bgColor = AppTheme.primaryBlue.withValues(alpha: 0.12);
          icon = Icons.info_outline_rounded;
          break;
      }
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppTheme.surfaceElevated,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isPositive ? AppTheme.cardBorder : iconColor.withValues(alpha: 0.3),
          width: 1,
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: bgColor,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, color: iconColor, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  factor.title,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                    color: AppTheme.textPrimary,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  factor.description,
                  style: const TextStyle(
                    fontSize: 13,
                    height: 1.4,
                    color: AppTheme.textSecondary,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
