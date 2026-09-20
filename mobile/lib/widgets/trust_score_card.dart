import 'package:flutter/material.dart';
import '../models/trust_report.dart';
import '../theme/app_theme.dart';

class TrustScoreCard extends StatefulWidget {
  final TrustReport trustReport;

  const TrustScoreCard({
    super.key,
    required this.trustReport,
  });

  @override
  State<TrustScoreCard> createState() => _TrustScoreCardState();
}

class _TrustScoreCardState extends State<TrustScoreCard> {
  bool _showCategories = false;

  Color get riskColor {
    switch (widget.trustReport.riskLevel) {
      case 'LAV_RISIKO':
        return AppTheme.safeGreen;
      case 'MODERAT_RISIKO':
        return AppTheme.warningAmber;
      case 'HOY_RISIKO':
      case 'KRITISK_RISIKO':
      default:
        return AppTheme.dangerRed;
    }
  }

  Color get riskBgColor {
    switch (widget.trustReport.riskLevel) {
      case 'LAV_RISIKO':
        return AppTheme.safeGreenBg.withValues(alpha: 0.35);
      case 'MODERAT_RISIKO':
        return AppTheme.warningAmberBg.withValues(alpha: 0.35);
      case 'HOY_RISIKO':
      case 'KRITISK_RISIKO':
      default:
        return AppTheme.dangerRedBg.withValues(alpha: 0.35);
    }
  }

  String get riskLabel {
    switch (widget.trustReport.riskLevel) {
      case 'LAV_RISIKO':
        return 'LAV RISIKO';
      case 'MODERAT_RISIKO':
        return 'MODERAT RISIKO';
      case 'HOY_RISIKO':
        return 'HØY RISIKO';
      case 'KRITISK_RISIKO':
        return 'KRITISK RISIKO';
      default:
        return widget.trustReport.riskLevel;
    }
  }

  @override
  Widget build(BuildContext context) {
    final tr = widget.trustReport;

    return Container(
      margin: const EdgeInsets.symmetric(vertical: 8),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: riskColor.withValues(alpha: 0.35),
          width: 1.5,
        ),
        boxShadow: [
          BoxShadow(
            color: riskColor.withValues(alpha: 0.08),
            blurRadius: 18,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Header: Score, Risiko-merke og Konfidens
          Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 10,
                            vertical: 5,
                          ),
                          decoration: BoxDecoration(
                            color: riskBgColor,
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(
                              color: riskColor.withValues(alpha: 0.6),
                              width: 1,
                            ),
                          ),
                          child: Text(
                            riskLabel,
                            style: TextStyle(
                              color: riskColor,
                              fontSize: 12,
                              fontWeight: FontWeight.w800,
                              letterSpacing: 0.5,
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        // Konfidens-indikator
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 5,
                          ),
                          decoration: BoxDecoration(
                            color: AppTheme.surfaceElevated,
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(
                              color: AppTheme.cardBorder,
                              width: 1,
                            ),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(
                                Icons.verified_user_outlined,
                                size: 13,
                                color: tr.confidence.level == 'HIGH'
                                    ? AppTheme.safeGreen
                                    : AppTheme.accentCyan,
                              ),
                              const SizedBox(width: 4),
                              Text(
                                '${tr.confidence.verifiedCategoriesCount}/${tr.confidence.totalCategoriesCount} verifisert',
                                style: const TextStyle(
                                  color: AppTheme.textSecondary,
                                  fontSize: 11,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    // Trust Score Tall
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.baseline,
                      textBaseline: TextBaseline.alphabetic,
                      children: [
                        Text(
                          '${tr.trustScore}',
                          style: TextStyle(
                            color: riskColor,
                            fontSize: 34,
                            fontWeight: FontWeight.w900,
                            letterSpacing: -0.5,
                          ),
                        ),
                        const Text(
                          '/100',
                          style: TextStyle(
                            color: AppTheme.textMuted,
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                // Fremdriftslinje for poeng
                ClipRRect(
                  borderRadius: BorderRadius.circular(6),
                  child: LinearProgressIndicator(
                    value: tr.trustScore / 100.0,
                    backgroundColor: AppTheme.surfaceElevated,
                    valueColor: AlwaysStoppedAnimation<Color>(riskColor),
                    minHeight: 8,
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  tr.executiveSummary,
                  style: const TextStyle(
                    color: AppTheme.textSecondary,
                    fontSize: 13.5,
                    height: 1.45,
                  ),
                ),
              ],
            ),
          ),

          // Hard Red Flag varsel hvis tilstede
          if (tr.hardRedFlags.isNotEmpty) ...[
            Container(
              margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppTheme.dangerRedBg.withValues(alpha: 0.6),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: AppTheme.dangerRed.withValues(alpha: 0.8),
                  width: 1.2,
                ),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(
                    Icons.gpp_bad_rounded,
                    color: AppTheme.dangerRed,
                    size: 22,
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          tr.hardRedFlags.first.title,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 13,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        const SizedBox(height: 3),
                        Text(
                          tr.hardRedFlags.first.description,
                          style: const TextStyle(
                            color: AppTheme.textPrimary,
                            fontSize: 12,
                            height: 1.35,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 8),
          ],

          // Skillelinje
          const Divider(height: 1, color: AppTheme.cardBorder),

          // "Hva vi fant" (bekreftet)
          if (tr.whatWeFound.isNotEmpty)
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: const [
                      Icon(
                        Icons.check_circle_rounded,
                        color: AppTheme.safeGreen,
                        size: 18,
                      ),
                      SizedBox(width: 8),
                      Text(
                        'Hva vi fant (bekreftet)',
                        style: TextStyle(
                          color: AppTheme.textPrimary,
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  ...tr.whatWeFound.map(
                    (item) => Padding(
                      padding: const EdgeInsets.only(bottom: 6),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Padding(
                            padding: EdgeInsets.only(top: 4),
                            child: Icon(
                              Icons.arrow_right_rounded,
                              color: AppTheme.safeGreen,
                              size: 18,
                            ),
                          ),
                          const SizedBox(width: 4),
                          Expanded(
                            child: Text(
                              item,
                              style: const TextStyle(
                                color: AppTheme.textSecondary,
                                fontSize: 13,
                                height: 1.4,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),

          // "Vær oppmerksom på" (advarsler)
          if (tr.watchOut.isNotEmpty) ...[
            const Divider(height: 1, color: AppTheme.cardBorder),
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: const [
                      Icon(
                        Icons.warning_amber_rounded,
                        color: AppTheme.warningAmber,
                        size: 18,
                      ),
                      SizedBox(width: 8),
                      Text(
                        'Vær oppmerksom på',
                        style: TextStyle(
                          color: AppTheme.textPrimary,
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  ...tr.watchOut.map(
                    (item) => Padding(
                      padding: const EdgeInsets.only(bottom: 6),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Padding(
                            padding: EdgeInsets.only(top: 4),
                            child: Icon(
                              Icons.arrow_right_rounded,
                              color: AppTheme.warningAmber,
                              size: 18,
                            ),
                          ),
                          const SizedBox(width: 4),
                          Expanded(
                            child: Text(
                              item,
                              style: const TextStyle(
                                color: AppTheme.textSecondary,
                                fontSize: 13,
                                height: 1.4,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],

          // Knapp for å se detaljert 8-kategoriers analyse
          InkWell(
            onTap: () {
              setState(() {
                _showCategories = !_showCategories;
              });
            },
            borderRadius: const BorderRadius.only(
              bottomLeft: Radius.circular(20),
              bottomRight: Radius.circular(20),
            ),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                color: AppTheme.surfaceElevated.withValues(alpha: 0.6),
                borderRadius: const BorderRadius.only(
                  bottomLeft: Radius.circular(18),
                  bottomRight: Radius.circular(18),
                ),
                border: const Border(
                  top: BorderSide(color: AppTheme.cardBorder),
                ),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    _showCategories
                        ? 'Skjul 8-kategoriers poengfordeling'
                        : 'Se 8-kategoriers poengfordeling',
                    style: const TextStyle(
                      color: AppTheme.accentCyan,
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  Icon(
                    _showCategories
                        ? Icons.keyboard_arrow_up_rounded
                        : Icons.keyboard_arrow_down_rounded,
                    color: AppTheme.accentCyan,
                    size: 20,
                  ),
                ],
              ),
            ),
          ),

          // Utfoldbar 8-kategoriers detaljer
          if (_showCategories)
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  _buildCategoryRow('Selskapsidentitet', tr.scoreBreakdown.businessIdentity, 20),
                  _buildCategoryRow('Økonomisk substans', tr.scoreBreakdown.financialFootprint, 15),
                  _buildCategoryRow('Digital identitet & DNS', tr.scoreBreakdown.digitalIdentity, 10),
                  _buildCategoryRow('Forbrukervern & retur', tr.scoreBreakdown.consumerProtection, 15),
                  _buildCategoryRow('Omtaler & anmeldelser', tr.scoreBreakdown.reviews, 15),
                  _buildCategoryRow('Produktopprinnelse & OEM', tr.scoreBreakdown.productTransparency, 10),
                  _buildCategoryRow('Helse- og markedsføringskrav', tr.scoreBreakdown.claimsAndEvidence, 10),
                  _buildCategoryRow('Eksterne risikosignaler', tr.scoreBreakdown.externalRiskSignals, 5),
                ],
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildCategoryRow(String title, ScoreCategoryDetail detail, num max) {
    final pct = (detail.score / (max > 0 ? max : 1.0)).clamp(0.0, 1.0);
    final color = pct >= 0.75
        ? AppTheme.safeGreen
        : pct >= 0.45
            ? AppTheme.warningAmber
            : AppTheme.dangerRed;

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                title,
                style: const TextStyle(
                  color: AppTheme.textPrimary,
                  fontSize: 12.5,
                  fontWeight: FontWeight.w600,
                ),
              ),
              Text(
                '${detail.score.toStringAsFixed(detail.score is int ? 0 : 1)} / $max poeng',
                style: TextStyle(
                  color: color,
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
          const SizedBox(height: 5),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: pct,
              backgroundColor: AppTheme.surfaceElevated,
              valueColor: AlwaysStoppedAnimation<Color>(color),
              minHeight: 5,
            ),
          ),
          if (detail.summary.isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(
              detail.summary,
              style: const TextStyle(
                color: AppTheme.textMuted,
                fontSize: 11,
              ),
            ),
          ],
        ],
      ),
    );
  }
}
