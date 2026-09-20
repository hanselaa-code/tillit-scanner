import 'package:flutter/material.dart';
import '../models/trust_report.dart';
import '../theme/app_theme.dart';

class PurchaseVerdictCard extends StatelessWidget {
  final TrustReport trustReport;

  const PurchaseVerdictCard({
    super.key,
    required this.trustReport,
  });

  @override
  Widget build(BuildContext context) {
    final verdict = trustReport.purchaseVerdict;
    final priceIntel = trustReport.priceIntelligence;
    final cost = trustReport.costObservability;

    if (verdict == null) {
      return const SizedBox.shrink();
    }

    return Container(
      margin: const EdgeInsets.symmetric(vertical: 10),
      decoration: BoxDecoration(
        color: AppTheme.surfaceElevated,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: AppTheme.accentCyan.withValues(alpha: 0.4),
          width: 1.5,
        ),
        boxShadow: [
          BoxShadow(
            color: AppTheme.accentCyan.withValues(alpha: 0.08),
            blurRadius: 16,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Header: AI Purchase Intelligence
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
            decoration: BoxDecoration(
              color: AppTheme.accentCyan.withValues(alpha: 0.12),
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(18),
                topRight: Radius.circular(18),
              ),
              border: Border(
                bottom: BorderSide(
                  color: AppTheme.accentCyan.withValues(alpha: 0.25),
                ),
              ),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: AppTheme.accentCyan.withValues(alpha: 0.2),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Icon(
                        Icons.shopping_bag_outlined,
                        color: AppTheme.accentCyan,
                        size: 20,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'AI Purchase Intelligence',
                          style: TextStyle(
                            color: AppTheme.textPrimary,
                            fontSize: 15,
                            fontWeight: FontWeight.w800,
                            letterSpacing: -0.2,
                          ),
                        ),
                        Text(
                          trustReport.scanType == 'fast'
                              ? 'Fast Scan • Hurtigoppslag'
                              : 'Deep Scan • Grundig due diligence',
                          style: const TextStyle(
                            color: AppTheme.textSecondary,
                            fontSize: 11,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
                // Kostnads- og ytelsesmerke (Cost Observability)
                if (cost != null)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppTheme.surface,
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(color: AppTheme.cardBorder),
                    ),
                    child: Text(
                      '${cost.executionTimeMs} ms • ${cost.estimatedCostNok.toStringAsFixed(2)} kr',
                      style: const TextStyle(
                        color: AppTheme.textMuted,
                        fontSize: 10.5,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
              ],
            ),
          ),

          // Hovedoverskrift og forbrukerveiledning
          Padding(
            padding: const EdgeInsets.all(18),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  verdict.summaryHeadline,
                  style: const TextStyle(
                    color: AppTheme.textPrimary,
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    letterSpacing: -0.3,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  verdict.consumerGuidance,
                  style: const TextStyle(
                    color: AppTheme.textSecondary,
                    fontSize: 13,
                    height: 1.4,
                  ),
                ),
                const SizedBox(height: 16),

                // De fem hovedspørsmålene (5 Key Purchase Questions)
                _buildQuestionPill(
                  question: '1. Kan jeg stole på selgeren?',
                  answer: _formatTrustAnswer(verdict.canITrustThis),
                  color: _getTrustColor(verdict.canITrustThis),
                  icon: Icons.verified_user_rounded,
                ),
                const SizedBox(height: 8),

                _buildQuestionPill(
                  question: '2. Er det god verdi for pengene?',
                  answer: _formatValueAnswer(verdict.isItGoodValue),
                  color: _getValueColor(verdict.isItGoodValue),
                  icon: Icons.price_check_rounded,
                ),
                const SizedBox(height: 8),

                _buildQuestionPill(
                  question: '3. Er anmeldelsene troverdige?',
                  answer: verdict.reviewsSummary == 'ANOMALIES_DETECTED'
                      ? 'Anomalier / bot-mønster funnet'
                      : verdict.reviewsSummary == 'INSUFFICIENT_DATA'
                          ? 'Begrenset datamengde'
                          : 'Normal spredning',
                  color: verdict.reviewsSummary == 'ANOMALIES_DETECTED'
                      ? AppTheme.warningAmber
                      : AppTheme.safeGreen,
                  icon: Icons.star_half_rounded,
                ),
                const SizedBox(height: 8),

                _buildQuestionPill(
                  question: '4. Er produktet originalt eller OEM?',
                  answer: verdict.productTransparency == 'LIKELY_OEM_PRIVATE_LABEL'
                      ? 'Typisk OEM / private-label modell'
                      : verdict.productTransparency == 'ORIGINAL_BRAND'
                          ? 'Eget varemerke / produsent'
                          : 'Uavklart opprinnelse',
                  color: verdict.productTransparency == 'LIKELY_OEM_PRIVATE_LABEL'
                      ? AppTheme.warningAmber
                      : AppTheme.safeGreen,
                  icon: Icons.inventory_2_outlined,
                ),
                const SizedBox(height: 8),

                _buildQuestionPill(
                  question: '5. Er markedsføringskrav dokumentert?',
                  answer: verdict.claimVerification == 'NOT_INDEPENDENTLY_VERIFIED'
                      ? 'Advarsel: Motsies av konsensus'
                      : verdict.claimVerification == 'LIMITED_EVIDENCE'
                          ? 'Begrenset uavhengig evidens'
                          : verdict.claimVerification == 'SUPPORTED'
                              ? 'Vitenskapelig dokumentert'
                              : 'Ingen helsepåstander',
                  color: verdict.claimVerification == 'NOT_INDEPENDENTLY_VERIFIED'
                      ? AppTheme.dangerRed
                      : verdict.claimVerification == 'LIMITED_EVIDENCE'
                          ? AppTheme.warningAmber
                          : AppTheme.safeGreen,
                  icon: Icons.fact_check_outlined,
                ),

                // Pris- og alternativsammenligning hvis tilgjengelig
                if (priceIntel != null && priceIntel.hasPriceAnalysis) ...[
                  const SizedBox(height: 18),
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: AppTheme.surface,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: AppTheme.cardBorder),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text(
                              'Pris- & markedsreferanse',
                              style: TextStyle(
                                color: AppTheme.textPrimary,
                                fontSize: 13,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                            if (priceIntel.priceDifferencePercentage != null &&
                                priceIntel.priceDifferencePercentage! > 0)
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: AppTheme.warningAmberBg,
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: Text(
                                  '+${priceIntel.priceDifferencePercentage}% vs referanse',
                                  style: const TextStyle(
                                    color: AppTheme.warningAmber,
                                    fontSize: 10,
                                    fontWeight: FontWeight.w800,
                                  ),
                                ),
                              ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            if (priceIntel.sellerPrice != null)
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text('Selgers pris', style: TextStyle(color: AppTheme.textMuted, fontSize: 11)),
                                    const SizedBox(height: 2),
                                    Text(
                                      '${priceIntel.sellerPrice} kr',
                                      style: const TextStyle(
                                        color: AppTheme.textPrimary,
                                        fontSize: 16,
                                        fontWeight: FontWeight.w800,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            if (priceIntel.minBenchmark != null && priceIntel.maxBenchmark != null)
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text('OEM markedsreferanse', style: TextStyle(color: AppTheme.textMuted, fontSize: 11)),
                                    const SizedBox(height: 2),
                                    Text(
                                      '${priceIntel.minBenchmark}–${priceIntel.maxBenchmark} kr',
                                      style: const TextStyle(
                                        color: AppTheme.safeGreen,
                                        fontSize: 16,
                                        fontWeight: FontWeight.w800,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                          ],
                        ),
                        if (priceIntel.importantNotice.isNotEmpty) ...[
                          const SizedBox(height: 8),
                          Text(
                            priceIntel.importantNotice,
                            style: const TextStyle(
                              color: AppTheme.textMuted,
                              fontSize: 11,
                              height: 1.35,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildQuestionPill({
    required String question,
    required String answer,
    required Color color,
    required IconData icon,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppTheme.cardBorder),
      ),
      child: Row(
        children: [
          Icon(icon, color: color, size: 18),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  question,
                  style: const TextStyle(
                    color: AppTheme.textMuted,
                    fontSize: 11,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                Text(
                  answer,
                  style: TextStyle(
                    color: color,
                    fontSize: 12.5,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  String _formatTrustAnswer(String val) {
    switch (val) {
      case 'LAV_RISIKO':
        return 'Ja, selger fremstår trygg og etablert';
      case 'MODERAT_RISIKO':
        return 'Moderat tillit – sjekk vilkårene nøye';
      case 'HOY_RISIKO':
      default:
        return 'Høy risiko – utvis stor forsiktighet';
    }
  }

  Color _getTrustColor(String val) {
    switch (val) {
      case 'LAV_RISIKO':
        return AppTheme.safeGreen;
      case 'MODERAT_RISIKO':
        return AppTheme.warningAmber;
      case 'HOY_RISIKO':
      default:
        return AppTheme.dangerRed;
    }
  }

  String _formatValueAnswer(String val) {
    switch (val) {
      case 'GOOD_VALUE':
        return 'God verdi sammenlignet med markedet';
      case 'MIXED':
        return 'Ordinært prisnivå for kategorien';
      case 'POTENTIALLY_POOR_VALUE':
        return 'Potensielt lav verdi (betydelig OEM-merpris)';
      case 'EXPENSIVE':
        return 'Dyr sammenlignet med tilsvarende modeller';
      case 'UNABLE_TO_DETERMINE':
      default:
        return 'Prissammenligning ikke tilgjengelig';
    }
  }

  Color _getValueColor(String val) {
    switch (val) {
      case 'GOOD_VALUE':
        return AppTheme.safeGreen;
      case 'MIXED':
      case 'UNABLE_TO_DETERMINE':
        return AppTheme.textSecondary;
      case 'EXPENSIVE':
      case 'POTENTIALLY_POOR_VALUE':
      default:
        return AppTheme.warningAmber;
    }
  }
}
