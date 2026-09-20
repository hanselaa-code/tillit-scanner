import 'package:flutter/material.dart';
import '../models/trust_report.dart';
import '../theme/app_theme.dart';

class ReviewIntelligenceCard extends StatelessWidget {
  final ReviewIntelligenceReport reviewReport;

  const ReviewIntelligenceCard({
    super.key,
    required this.reviewReport,
  });

  @override
  Widget build(BuildContext context) {
    if (reviewReport.totalReviewCount == 0 && !reviewReport.similarityAnomaly.detected) {
      return const SizedBox.shrink();
    }

    final hasAnomaly = reviewReport.similarityAnomaly.detected;

    return Container(
      margin: const EdgeInsets.symmetric(vertical: 8),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: hasAnomaly
              ? AppTheme.warningAmber.withValues(alpha: 0.5)
              : AppTheme.cardBorder,
          width: 1.2,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Header
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: AppTheme.primaryBlue.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(
                    Icons.rate_review_rounded,
                    color: AppTheme.primaryBlue,
                    size: 20,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Review Intelligence & NLP',
                        style: TextStyle(
                          color: AppTheme.textPrimary,
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      Text(
                        '${reviewReport.totalReviewCount} anmeldelser analysert • Snitt ${reviewReport.averageRating.toStringAsFixed(1)} / 5.0',
                        style: const TextStyle(
                          color: AppTheme.textSecondary,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ),
                // Snittkarakter
                Row(
                  children: [
                    const Icon(
                      Icons.star_rounded,
                      color: AppTheme.warningAmber,
                      size: 20,
                    ),
                    const SizedBox(width: 2),
                    Text(
                      reviewReport.averageRating.toStringAsFixed(1),
                      style: const TextStyle(
                        color: AppTheme.textPrimary,
                        fontSize: 16,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),

          // Anomali-varsel (NLP Similarity / Tekstrepetisjon)
          if (hasAnomaly) ...[
            Container(
              margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppTheme.warningAmberBg.withValues(alpha: 0.5),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: AppTheme.warningAmber.withValues(alpha: 0.7),
                  width: 1,
                ),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(
                    Icons.manage_search_rounded,
                    color: AppTheme.warningAmber,
                    size: 20,
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            const Text(
                              'NLP Anomali detektert',
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 13,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                            const SizedBox(width: 6),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: AppTheme.warningAmber,
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: Text(
                                '${reviewReport.similarityAnomaly.similarityScore}% likhet',
                                style: const TextStyle(
                                  color: Colors.black,
                                  fontSize: 10,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text(
                          reviewReport.similarityAnomaly.explanation,
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

          // Ratingfordeling (5 til 1 stjerne)
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Column(
              children: [
                _buildStarRow(5, reviewReport.ratingDistribution.fiveStarPct),
                _buildStarRow(4, reviewReport.ratingDistribution.fourStarPct),
                _buildStarRow(3, reviewReport.ratingDistribution.threeStarPct),
                _buildStarRow(2, reviewReport.ratingDistribution.twoStarPct),
                _buildStarRow(1, reviewReport.ratingDistribution.oneStarPct),
              ],
            ),
          ),

          // Tematiske klynger (Clusters)
          if (reviewReport.clusters.isNotEmpty) ...[
            const Divider(height: 1, color: AppTheme.cardBorder),
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Hva kundene snakker om (klynger):',
                    style: TextStyle(
                      color: AppTheme.textPrimary,
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: reviewReport.clusters.map((cl) {
                      final isPos = cl.sentiment == 'POSITIV';
                      final isNeg = cl.sentiment == 'NEGATIV';
                      final chipColor = isPos
                          ? AppTheme.safeGreen
                          : isNeg
                              ? AppTheme.dangerRed
                              : AppTheme.warningAmber;

                      return Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                        decoration: BoxDecoration(
                          color: chipColor.withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(
                            color: chipColor.withValues(alpha: 0.35),
                          ),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(
                              isPos
                                  ? Icons.thumb_up_alt_rounded
                                  : isNeg
                                      ? Icons.thumb_down_alt_rounded
                                      : Icons.remove_rounded,
                              size: 13,
                              color: chipColor,
                            ),
                            const SizedBox(width: 6),
                            Text(
                              '${cl.summary} (${cl.frequencyPercentage}%)',
                              style: TextStyle(
                                color: chipColor,
                                fontSize: 11.5,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                      );
                    }).toList(),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildStarRow(int stars, num pct) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2.5),
      child: Row(
        children: [
          SizedBox(
            width: 50,
            child: Row(
              children: [
                Text(
                  '$stars',
                  style: const TextStyle(
                    color: AppTheme.textSecondary,
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(width: 4),
                const Icon(
                  Icons.star_rounded,
                  color: AppTheme.warningAmber,
                  size: 13,
                ),
              ],
            ),
          ),
          Expanded(
            child: ClipRRect(
              borderRadius: BorderRadius.circular(3),
              child: LinearProgressIndicator(
                value: (pct / 100.0).clamp(0.0, 1.0),
                backgroundColor: AppTheme.surfaceElevated,
                valueColor: AlwaysStoppedAnimation<Color>(
                  stars >= 4
                      ? AppTheme.safeGreen
                      : stars == 3
                          ? AppTheme.warningAmber
                          : AppTheme.dangerRed,
                ),
                minHeight: 6,
              ),
            ),
          ),
          const SizedBox(width: 10),
          SizedBox(
            width: 38,
            child: Text(
              '${pct.toInt()}%',
              textAlign: TextAlign.end,
              style: const TextStyle(
                color: AppTheme.textMuted,
                fontSize: 11,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
