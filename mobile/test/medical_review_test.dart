import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/models/analysis_result.dart';
import 'package:mobile/widgets/medical_fact_check_card.dart';

void main() {
  group('MedicalExpertReview Models & Widget Tests', () {
    test('Deserializes MedicalExpertReview correctly from JSON', () {
      final json = {
        'hasMedicalClaims': true,
        'doctorSummary':
            'Pee-woop! Dette tilskuddet påstår å forbrenne fett over natten, men fysiologisk er det umulig.',
        'overallVerdict': 'Villedende markedsføring',
        'claims': [
          {
            'claim': 'Forbrenner 5 kg fett på en uke',
            'verdict': 'MYTE',
            'scientificExplanation':
                'Fettforbrenning krever et vedvarende kaloriunderskudd.',
            'evidenceLevel': 'Motbevist',
            'sourcesOrConsensus': ['EFSA', 'Helsedirektoratet'],
          },
          {
            'claim': 'Inneholder vitamin C som støtter immunforsvaret',
            'verdict': 'DOKUMENTERT',
            'scientificExplanation':
                'Vitamin C bidrar til immunsystemets normale funksjon.',
            'evidenceLevel': 'Høy (flere RCT/systematiske oversikter)',
            'sourcesOrConsensus': ['EFSA'],
          }
        ],
        'disclaimer': 'Erstatter ikke lege.',
      };

      final review = MedicalExpertReview.fromJson(json);
      expect(review.hasMedicalClaims, true);
      expect(review.claims.length, 2);
      expect(review.claims[0].verdict, MedicalClaimVerdict.myth);
      expect(review.claims[0].verdictLabel, 'Medisinsk myte');
      expect(review.claims[1].verdict, MedicalClaimVerdict.documented);
      expect(review.claims[1].verdictLabel, 'Dokumentert');
    });

    testWidgets('MedicalFactCheckCard renders Doctor Mike review properly',
        (WidgetTester tester) async {
      final review = MedicalExpertReview(
        hasMedicalClaims: true,
        doctorSummary: 'Fysiologisk er det ingen snarveier her.',
        overallVerdict: 'Udokumenterte påstander',
        claims: [
          MedicalClaimFactCheck(
            claim: 'Kurerer leddgikt',
            verdict: MedicalClaimVerdict.dangerous,
            scientificExplanation:
                'Leddgikt er en kronisk autoimmun sykdom som krever spesialistoppfølging.',
            evidenceLevel: 'Motbevist',
            sourcesOrConsensus: ['DMP', 'Cochrane'],
          ),
        ],
        disclaimer: 'Erstatter ikke lege.',
      );

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: MedicalFactCheckCard(medicalReview: review),
          ),
        ),
      );

      expect(find.text('Medisinsk Faktasjekk'), findsOneWidget);
      expect(find.text('Dr. Mike Style'), findsOneWidget);
      expect(find.text("Doctor's Reality Check"), findsOneWidget);
      expect(find.text('Kurerer leddgikt'), findsOneWidget);
      expect(find.text('Advarsel: Potensielt farlig'), findsOneWidget);
      expect(find.text('Cochrane'), findsOneWidget);
    });
  });
}
