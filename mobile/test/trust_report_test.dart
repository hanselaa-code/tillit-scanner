import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/models/trust_report.dart';
import 'package:mobile/widgets/trust_score_card.dart';
import 'package:mobile/widgets/review_intelligence_card.dart';
import 'package:mobile/widgets/purchase_verdict_card.dart';

void main() {
  group('TrustReport Models & Widget Tests', () {
    test('Deserializes TrustReport correctly from JSON', () {
      final json = {
        'id': 'test-report-1',
        'analyzedAt': '2026-03-20T12:00:00Z',
        'subject': {
          'query': 'Vellafit',
          'resolvedName': 'Vellafit',
          'officialLegalName': 'VELLAFIT APS',
          'country': 'Danmark',
          'websiteUrl': 'vellafit.no',
        },
        'trustScore': 58,
        'riskLevel': 'MODERAT_RISIKO',
        'confidence': {
          'level': 'HIGH',
          'verifiedCategoriesCount': 7,
          'totalCategoriesCount': 8,
          'explanation': '7 av 8 kategorier verifisert mot kilder.',
        },
        'scoreBreakdown': {
          'businessIdentity': {
            'score': 8,
            'maxScore': 20,
            'weightPercentage': 20,
            'evaluated': true,
            'summary': 'Utenlandsk foretak uten AS i Norge.',
          },
        },
        'executiveSummary': 'Vellafit oppnår 58/100 (Moderat risiko).',
        'whatWeFound': ['Aktivt .no-domene med HTTPS.'],
        'watchOut': ['Ingen registrert norsk enhet i Brreg.'],
        'hardRedFlags': [],
        'timeline': [],
        'financialSubstance': {
          'status': 'INGEN_DATA',
          'summary': 'Utenlandske regnskapsdata ikke tilgjengelig.',
          'accountingNotes': [],
        },
        'consumerProtection': {
          'status': 'TILFREDSHILLENDE',
          'summary': 'Standard 14 dagers returrett.',
          'withdrawalPeriodDays': 14,
          'hasPhysicalReturnAddress': true,
          'vatAndDutiesIncluded': true,
          'paymentMethods': ['Klarna', 'Kredittkort'],
          'hasCryptoOnlyWarning': false,
          'termsContradictions': [],
        },
        'reviewIntelligence': {
          'totalReviewCount': 45,
          'averageRating': 4.1,
          'ratingDistribution': {
            'fiveStarPct': 65,
            'fourStarPct': 20,
            'threeStarPct': 5,
            'twoStarPct': 3,
            'oneStarPct': 7,
          },
          'reviewVelocity': {
            'last30DaysCount': 10,
            'last90DaysCount': 25,
            'hasUnusualSpike': false,
          },
          'clusters': [
            {
              'topic': 'PRODUKTKVALITET',
              'sentiment': 'POSITIV',
              'summary': 'Enkel å bruke vekten',
              'frequencyPercentage': 40,
            }
          ],
          'similarityAnomaly': {
            'detected': true,
            'similarityScore': 85,
            'similarityLevel': 'HOY',
            'explanation': 'Høy lingvistisk repetisjon oppdaget.',
          },
        },
        'productSupplyChain': {
          'hasProductAnalysis': true,
          'detectedProductName': 'Vellafit Smart Vekt',
          'originMatch': 'LIKELY_OEM_FAMILY',
          'originExplanation': 'Forbrukervekt med OEM opprinnelse.',
          'regulatoryClassification': 'WELLNESS_PRODUCT',
        },
        'drMikeMedical': {
          'hasMedicalClaims': true,
          'doctorSummary': 'BIA-teknologi har begrensninger.',
          'overallDoctorVerdict': 'Udokumenterte påstander',
          'claims': [
            {
              'claim': '98.5% presisjon',
              'verdict': 'INSUFFICIENT_EVIDENCE',
              'verdictLabel': 'Ikke verifisert',
              'evidenceLevel': 'LEVEL_E_PRODUSENTENS_DATA',
              'evidenceQuality': 'LOW',
              'whatTheEvidenceSays': 'DEXA forblir gullstandarden.',
              'sources': ['Cochrane'],
            }
          ],
        },
        'evidenceChain': [
          {
            'id': 'ev-1',
            'category': 'IDENTITY',
            'claim': 'Norsk registrering',
            'finding': 'Ikke funnet i Brreg',
            'verdict': 'ADVARSEL',
            'sourceName': 'Brønnøysundregistrene',
            'sourceType': 'OFFISIELT_REGISTER',
            'retrievedAt': '2026-03-20T12:00:00Z',
            'confidence': 'HIGH',
          }
        ],
      };

      final report = TrustReport.fromJson(json);
      expect(report.trustScore, 58);
      expect(report.riskLevel, 'MODERAT_RISIKO');
      expect(report.subject.officialLegalName, 'VELLAFIT APS');
      expect(report.confidence.level, 'HIGH');
      expect(report.confidence.verifiedCategoriesCount, 7);
      expect(report.reviewIntelligence.similarityAnomaly.detected, true);
      expect(report.reviewIntelligence.clusters.length, 1);
      expect(report.drMikeMedical.claims.length, 1);
      expect(report.evidenceChain.length, 1);
    });

    testWidgets('TrustScoreCard and ReviewIntelligenceCard render properly',
        (WidgetTester tester) async {
      final json = {
        'id': 'test-report-2',
        'analyzedAt': '2026-03-20T12:00:00Z',
        'subject': {
          'query': 'Vellafit',
          'resolvedName': 'Vellafit',
          'officialLegalName': 'VELLAFIT APS',
          'country': 'Danmark',
        },
        'trustScore': 58,
        'riskLevel': 'MODERAT_RISIKO',
        'confidence': {
          'level': 'HIGH',
          'verifiedCategoriesCount': 7,
          'totalCategoriesCount': 8,
          'explanation': 'God kildeverifisering.',
        },
        'scoreBreakdown': {
          'businessIdentity': {'score': 8, 'maxScore': 20, 'summary': 'OK'},
        },
        'executiveSummary': 'Vellafit oppnår 58/100 (Moderat risiko).',
        'whatWeFound': ['Aktivt domene med HTTPS.'],
        'watchOut': ['Ingen registrert norsk enhet i Brreg.'],
        'hardRedFlags': [],
        'timeline': [],
        'financialSubstance': {'status': 'INGEN_DATA', 'summary': ''},
        'consumerProtection': {
          'status': 'TILFREDSHILLENDE',
          'summary': 'Standard 14 dager.',
          'hasPhysicalReturnAddress': true,
          'vatAndDutiesIncluded': true,
          'paymentMethods': ['Klarna'],
          'hasCryptoOnlyWarning': false,
          'termsContradictions': [],
        },
        'reviewIntelligence': {
          'totalReviewCount': 30,
          'averageRating': 4.2,
          'ratingDistribution': {
            'fiveStarPct': 70,
            'fourStarPct': 20,
            'threeStarPct': 10,
            'twoStarPct': 0,
            'oneStarPct': 0,
          },
          'reviewVelocity': {'last30DaysCount': 5, 'last90DaysCount': 15, 'hasUnusualSpike': false},
          'clusters': [],
          'similarityAnomaly': {
            'detected': true,
            'similarityScore': 80,
            'similarityLevel': 'HOY',
            'explanation': 'Tekstrepetisjon funnet.',
          },
        },
        'productSupplyChain': {
          'hasProductAnalysis': false,
          'originMatch': 'NOT_APPLICABLE',
          'originExplanation': '',
          'regulatoryClassification': 'CONSUMER_GOODS',
        },
        'drMikeMedical': {'hasMedicalClaims': false, 'claims': []},
        'evidenceChain': [],
      };

      final report = TrustReport.fromJson(json);

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SingleChildScrollView(
              child: Column(
                children: [
                  TrustScoreCard(trustReport: report),
                  ReviewIntelligenceCard(reviewReport: report.reviewIntelligence),
                ],
              ),
            ),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('58'), findsOneWidget);
      expect(find.text('MODERAT RISIKO'), findsOneWidget);
      expect(find.text('Hva vi fant (bekreftet)'), findsOneWidget);
      expect(find.text('Vær oppmerksom på'), findsOneWidget);
      expect(find.text('Review Intelligence & NLP'), findsOneWidget);
      expect(find.text('NLP Anomali detektert'), findsOneWidget);
    });

    testWidgets('PurchaseVerdictCard renders 5 core purchase intelligence questions',
        (WidgetTester tester) async {
      final json = {
        'id': 'test-report-purchase',
        'analyzedAt': '2026-03-20T12:00:00Z',
        'subject': {
          'query': 'Vellafit',
          'resolvedName': 'Vellafit',
          'officialLegalName': 'VELLAFIT APS',
          'country': 'Danmark',
        },
        'trustScore': 58,
        'riskLevel': 'MODERAT_RISIKO',
        'confidence': {'level': 'HIGH', 'verifiedCategoriesCount': 7, 'totalCategoriesCount': 8, 'explanation': 'OK'},
        'scoreBreakdown': {'businessIdentity': {'score': 8, 'maxScore': 20, 'summary': 'OK'}},
        'executiveSummary': 'Vellafit test.',
        'whatWeFound': [],
        'watchOut': [],
        'hardRedFlags': [],
        'timeline': [],
        'financialSubstance': {'status': 'INGEN_DATA', 'summary': ''},
        'consumerProtection': {
          'status': 'TILFREDSHILLENDE',
          'summary': 'Standard',
          'hasPhysicalReturnAddress': true,
          'vatAndDutiesIncluded': true,
          'paymentMethods': ['Klarna'],
          'hasCryptoOnlyWarning': false,
          'termsContradictions': [],
        },
        'reviewIntelligence': {
          'totalReviewCount': 30,
          'averageRating': 4.2,
          'ratingDistribution': {'fiveStarPct': 70, 'fourStarPct': 20, 'threeStarPct': 10, 'twoStarPct': 0, 'oneStarPct': 0},
          'reviewVelocity': {'last30DaysCount': 5, 'last90DaysCount': 15, 'hasUnusualSpike': false},
          'clusters': [],
          'similarityAnomaly': {'detected': false, 'similarityScore': 0, 'similarityLevel': 'INGEN', 'explanation': ''},
        },
        'productSupplyChain': {'hasProductAnalysis': true, 'originMatch': 'LIKELY_OEM_FAMILY', 'originExplanation': 'OEM', 'regulatoryClassification': 'WELLNESS_PRODUCT'},
        'drMikeMedical': {'hasMedicalClaims': false, 'claims': []},
        'priceIntelligence': {
          'hasPriceAnalysis': true,
          'sellerPrice': {'amount': 1999, 'currency': 'NOK'},
          'similarProductsPriceRange': {'min': 399, 'max': 799, 'currency': 'NOK'},
          'priceDifferencePercentage': 150,
          'priceVerdict': 'POTENTIALLY_POOR_VALUE',
          'alternativeCandidates': [
            {
              'candidateProduct': 'Xiaomi Mi Scale',
              'similarity': 85,
              'price': 399,
              'currency': 'NOK',
              'confidence': 'MODERATE',
              'matchType': 'LIKELY_OEM_FAMILY',
              'notes': 'Tilsvarende BIA maskinvare'
            }
          ],
          'importantNotice': 'OEM benchmark sammenligning.'
        },
        'purchaseVerdict': {
          'canITrustThis': 'MODERAT_RISIKO',
          'isItGoodValue': 'POTENTIALLY_POOR_VALUE',
          'reviewsSummary': 'NORMAL',
          'productTransparency': 'LIKELY_OEM_PRIVATE_LABEL',
          'claimVerification': 'LIMITED_EVIDENCE',
          'summaryHeadline': 'Etablert selger, men potensielt lav verdi for pengene',
          'consumerGuidance': 'Sjekk alternative modeller før kjøp.'
        },
        'costObservability': {
          'scanId': 'test-report-purchase',
          'scanType': 'deep',
          'modelCalls': 2,
          'modelsUsed': ['gemini-2.5-flash'],
          'inputTokens': 1500,
          'outputTokens': 400,
          'executionTimeMs': 350,
          'cacheHits': 0,
          'cacheMisses': 1,
          'estimatedCostUsd': 0.0005,
          'estimatedCostNok': 0.0054
        },
        'scanType': 'deep',
        'evidenceChain': [],
      };

      final report = TrustReport.fromJson(json);

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SingleChildScrollView(
              child: Column(
                children: [
                  PurchaseVerdictCard(trustReport: report),
                ],
              ),
            ),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('AI Purchase Intelligence'), findsOneWidget);
      expect(find.text('1. Kan jeg stole på selgeren?'), findsOneWidget);
      expect(find.text('2. Er det god verdi for pengene?'), findsOneWidget);
      expect(find.text('3. Er anmeldelsene troverdige?'), findsOneWidget);
      expect(find.text('4. Er produktet originalt eller OEM?'), findsOneWidget);
      expect(find.text('5. Er markedsføringskrav dokumentert?'), findsOneWidget);
      expect(find.text('Pris- & markedsreferanse'), findsOneWidget);
      expect(find.text('1999 kr'), findsOneWidget);
      expect(find.text('399–799 kr'), findsOneWidget);
    });
  });
}
