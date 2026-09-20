import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../models/analysis_result.dart';
import '../theme/app_theme.dart';
import '../widgets/score_gauge.dart';
import '../widgets/risk_factor_tile.dart';
import '../widgets/detail_accordion.dart';
import '../widgets/medical_fact_check_card.dart';
import '../widgets/trust_score_card.dart';
import '../widgets/review_intelligence_card.dart';

class ResultScreen extends StatelessWidget {
  final FinalAnalysisReport report;

  const ResultScreen({super.key, required this.report});

  @override
  Widget build(BuildContext context) {
    final statusColor = report.statusColor;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Analyse og Risikovurdering'),
        actions: [
          IconButton(
            tooltip: 'Kopier rapport',
            icon: const Icon(Icons.copy_rounded),
            onPressed: () {
              final medicalSection = (report.medicalReview != null && report.medicalReview!.hasMedicalClaims)
                  ? '''

MEDISINSK VURDERING (DR. MIKE STIL):
Overordnet dom: ${report.medicalReview!.overallVerdict}
Legens reality check: ${report.medicalReview!.doctorSummary}
Granskede påstander:
${report.medicalReview!.claims.map((c) => '• "${c.claim}": ${c.verdictLabel} (${c.evidenceLevel}) - ${c.scientificExplanation}').join('\n')}
'''
                  : '';

              final text = '''
SCANSAFE / TILLIT RAPPORT
Subjekt: ${report.identifiedSubject.name ?? 'Ukjent'}
Seriøsitetsscore: ${report.score}/100 (${report.riskLevel} RISIKO)
Sammendrag: ${report.executiveSummary}
Råd: ${report.actionableAdvice.join(' ')}$medicalSection
''';
              Clipboard.setData(ClipboardData(text: text));
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Rapportsammendrag kopiert til utklippstavlen'),
                  behavior: SnackBarBehavior.floating,
                ),
              );
            },
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Toppkort med tittel og subjekt
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: AppTheme.surface,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AppTheme.cardBorder),
              ),
              child: Column(
                children: [
                  if (report.identifiedSubject.name != null) ...[
                    Text(
                      report.identifiedSubject.name!,
                      style: const TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.w700,
                        color: AppTheme.textPrimary,
                        letterSpacing: -0.5,
                      ),
                      textAlign: TextAlign.center,
                    ),
                    if (report.identifiedSubject.legalName != null &&
                        report.identifiedSubject.legalName!.toLowerCase() !=
                            report.identifiedSubject.name!.toLowerCase()) ...[
                      const SizedBox(height: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppTheme.primaryBlue.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: AppTheme.primaryBlue.withValues(alpha: 0.3)),
                        ),
                        child: Text(
                          report.identifiedSubject.relationship != null
                              ? '${report.identifiedSubject.relationship}: ${report.identifiedSubject.legalName!}'
                              : 'Juridisk foretak: ${report.identifiedSubject.legalName!}',
                          style: const TextStyle(
                            fontSize: 12,
                            color: AppTheme.primaryBlue,
                            fontWeight: FontWeight.w600,
                          ),
                          textAlign: TextAlign.center,
                        ),
                      ),
                    ],
                    const SizedBox(height: 4),
                  ],
                  if (report.identifiedSubject.orgNumber != null) ...[
                    Text(
                      'Org.nr: ${report.identifiedSubject.orgNumber}',
                      style: const TextStyle(
                        fontSize: 13,
                        color: AppTheme.textMuted,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const SizedBox(height: 6),
                  ],
                  if (report.identifiedSubject.detectedProduct != null) ...[
                    Container(
                      margin: const EdgeInsets.only(bottom: 10),
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: AppTheme.surfaceElevated,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: AppTheme.cardBorder),
                      ),
                      child: Text(
                        'Produkt observert på siden: ${report.identifiedSubject.detectedProduct!}',
                        style: const TextStyle(
                          fontSize: 12,
                          color: AppTheme.textSecondary,
                          fontStyle: FontStyle.italic,
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ),
                  ],
                  if (report.trustReport != null) ...[
                    const SizedBox(height: 12),
                    TrustScoreCard(trustReport: report.trustReport!),
                  ] else ...[
                    const SizedBox(height: 8),
                    ScoreGauge(
                      score: report.score,
                      trafficLight: report.trafficLight,
                      riskLevel: report.riskLevel,
                    ),
                    const SizedBox(height: 16),
                    Text(
                      report.headline,
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                        color: statusColor,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      report.executiveSummary,
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        fontSize: 14,
                        color: AppTheme.textSecondary,
                        height: 1.45,
                      ),
                    ),
                  ],
                ],
              ),
            ),

            // Review Intelligence & NLP Anomalisjekk
            if (report.trustReport != null) ...[
              ReviewIntelligenceCard(
                reviewReport: report.trustReport!.reviewIntelligence,
              ),
            ],

            // Medisinsk Faktasjekk & Reklamegransking (Doctor Mike-stil)
            if (report.medicalReview != null && report.medicalReview!.hasMedicalClaims) ...[
              MedicalFactCheckCard(medicalReview: report.medicalReview!),
            ],

            const SizedBox(height: 20),

            // Handlingsanbefalinger til forbrukeren
            if (report.actionableAdvice.isNotEmpty) ...[
              Container(
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  color: AppTheme.surfaceElevated,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: AppTheme.primaryBlue.withValues(alpha: 0.3),
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Row(
                      children: [
                        Icon(Icons.shield_rounded, color: AppTheme.primaryBlue, size: 20),
                        SizedBox(width: 8),
                        Text(
                          'Anbefalte tiltak for deg som forbruker',
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w700,
                            color: AppTheme.textPrimary,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    ...report.actionableAdvice.map(
                      (advice) => Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              '• ',
                              style: TextStyle(
                                color: AppTheme.primaryBlue,
                                fontWeight: FontWeight.bold,
                                fontSize: 16,
                              ),
                            ),
                            Expanded(
                              child: Text(
                                advice,
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
              const SizedBox(height: 20),
            ],

            // Risikofaktorer funnet
            if (report.riskFactors.isNotEmpty) ...[
              const Text(
                'Identifiserte risikomomenter',
                style: TextStyle(
                  fontSize: 17,
                  fontWeight: FontWeight.w700,
                  color: AppTheme.textPrimary,
                ),
              ),
              const SizedBox(height: 10),
              ...report.riskFactors.map(
                (factor) => RiskFactorTile(factor: factor, isPositive: false),
              ),
              const SizedBox(height: 16),
            ],

            // Positive faktorer
            if (report.positiveFactors.isNotEmpty) ...[
              const Text(
                'Bekreftede tillitsfaktorer',
                style: TextStyle(
                  fontSize: 17,
                  fontWeight: FontWeight.w700,
                  color: AppTheme.textPrimary,
                ),
              ),
              const SizedBox(height: 10),
              ...report.positiveFactors.map(
                (factor) => RiskFactorTile(factor: factor, isPositive: true),
              ),
              const SizedBox(height: 16),
            ],

            // Detaljerte kildekort (Brreg, Domene, Bilde)
            const Text(
              'Tekniske registeroppslag & kilder',
              style: TextStyle(
                fontSize: 17,
                fontWeight: FontWeight.w700,
                color: AppTheme.textPrimary,
              ),
            ),
            const SizedBox(height: 10),
            DetailAccordion(report: report),

            const SizedBox(height: 24),

            // Ny skanning-knapp
            ElevatedButton.icon(
              onPressed: () => Navigator.of(context).pop(),
              icon: const Icon(Icons.refresh_rounded),
              label: const Text('Gjennomfør ny skanning'),
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }
}
