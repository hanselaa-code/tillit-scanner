import test from 'node:test';
import assert from 'node:assert';
import { EntityResolverService } from './services/entity-resolver.service';
import { ProductIntelligenceService } from './services/product-intelligence.service';
import { DrMikeService } from './services/dr-mike.service';
import { ReviewIntelligenceService } from './services/review-intelligence.service';
import { OrchestratorService } from './services/orchestrator.service';

test('Golden Integration Test: Vellafit Full Due Diligence Profile', async (t) => {
  const entityResolver = new EntityResolverService();
  const productIntelligence = new ProductIntelligenceService();
  const drMikeService = new DrMikeService();
  const reviewIntelligence = new ReviewIntelligenceService();
  const orchestrator = new OrchestratorService();

  await t.test('1. Selskapsidentitet: Avslører at Vellafit opererer som dansk ApS uten registrert norsk AS/NUF', async () => {
    const resolved = await entityResolver.resolve('Vellafit', 'https://vellafit.no');

    assert.strictEqual(resolved.resolvedName, 'Vellafit');
    assert.strictEqual(resolved.officialLegalName, 'VELLAFIT APS');
    assert.strictEqual(resolved.country, 'Danmark');
    assert.strictEqual(resolved.isRegisteredInNorway, false, 'Skal ikke være registrert som norsk AS i Brreg');

    // Må ha generert advarsel for .no-domene uten norsk registrering
    const warningEvidence = resolved.evidence.find((e) => e.id.includes('ev-identity-brreg-missing'));
    assert.ok(warningEvidence, 'Skal finne advarsels-bevis for manglende Brreg-registrering med .no-domene');
    assert.strictEqual(warningEvidence?.verdict, 'ADVARSEL');
    assert.ok(warningEvidence?.sourceName.includes('Brønnøysundregistrene'));
  });

  await t.test('2. Product & Supply Chain: Klassifiserer Vellafit Smart Vekt som LIKELY_OEM_FAMILY og velværeprodukt', async () => {
    const { report, evidence } = productIntelligence.analyzeProduct(
      'Vellafit Smart Vekt',
      'Vellafit kroppsskanner med bioimpedans og CE-merket elektrisk sikkerhet'
    );

    assert.strictEqual(report.hasProductAnalysis, true);
    assert.strictEqual(report.originMatch, 'LIKELY_OEM_FAMILY', 'Forbrukervekter med BIA tilhører OEM-kategorien');
    assert.strictEqual(report.regulatoryClassification, 'WELLNESS_PRODUCT');
    assert.ok(report.originExplanation.includes('OEM- og private-label-produksjon'));

    const oemEvidence = evidence.find((e) => e.category === 'PRODUCT' && e.verdict === 'INFERENS');
    assert.ok(oemEvidence, 'Skal produsere et bevisobjekt for OEM-klassifisering');
    assert.strictEqual(oemEvidence?.confidence, 'MODERATE');
  });

  await t.test('3. Dr. Mike Medical Engine: Vurderer 98.5% nøyaktighet vs DEXA som Level E / INSUFFICIENT_EVIDENCE', async () => {
    const contextText = 'Vellafit Smart Vekt tilbyr 98.5% nøyaktighet sammenlignet med DEXA-skanning for analyse av kroppssammensetning';
    const { report, evidence } = drMikeService.verifyClaims(contextText);

    assert.strictEqual(report.hasMedicalClaims, true);
    assert.ok(report.claims.length >= 1);

    const accuracyClaim = report.claims.find((c) => c.claim.includes('98.5'));
    assert.ok(accuracyClaim, 'Skal gjenkjenne 98.5% nøyaktighetspåstanden');
    assert.strictEqual(accuracyClaim?.verdict, 'INSUFFICIENT_EVIDENCE');
    assert.strictEqual(accuracyClaim?.evidenceLevel, 'LEVEL_E_PRODUSENTENS_DATA');
    assert.strictEqual(accuracyClaim?.evidenceQuality, 'LOW');
    assert.ok(accuracyClaim?.whatTheEvidenceSays.includes('Bioelektrisk impedans (BIA)'));
    assert.ok(accuracyClaim?.importantLimitation?.includes('ingen fagfellevurderte uavhengige valideringsstudier'));

    const medicalEvidence = evidence.find((e) => e.category === 'MEDICAL');
    assert.ok(medicalEvidence);
    assert.strictEqual(medicalEvidence?.verdict, 'INFERENS');
  });

  await t.test('4. Review Intelligence: Avdekker repeterende NLP-lingvistisk mønster som anomali', async () => {
    const suspiciousReviewTexts = [
      'Helt fantastisk produkt, hjalp meg utrolig mye å nå vektmålet raskt og enkelt!',
      'Helt fantastisk produkt, hjalp meg utrolig mye å nå vektmålet raskt og enkelt!',
      'Veldig fantastisk produkt, hjalp meg utrolig mye å nå vektmålet raskt og enkelt!',
      'Fantastisk produkt, hjalp meg utrolig mye å nå målet mitt!',
    ];

    const { report, evidence } = reviewIntelligence.analyzeReviews(
      undefined,
      undefined,
      suspiciousReviewTexts
    );

    assert.strictEqual(report.similarityAnomaly.detected, true, 'Skal detektere tekstrepetisjon blant anmeldelsene');
    assert.ok(['MODERAT', 'HOY'].includes(report.similarityAnomaly.similarityLevel));

    const reviewEvidence = evidence.find((e) => e.category === 'REVIEWS' && e.verdict === 'ADVARSEL');
    assert.ok(reviewEvidence, 'Skal generere bevis for anmeldelsesanomali');
  });

  await t.test('5. End-to-end Orchestrator: Produserer komplett Trust Report for Vellafit med substans- og evidenskjede', async () => {
    const report = await orchestrator.analyze({
      query: 'Vellafit Smart Vekt https://vellafit.no 98.5% nøyaktighet',
    });

    assert.ok(report.trustReport, 'Rapporten må inneholde et fullverdig trustReport-objekt');
    const tr = report.trustReport;

    // Subjekt-attributter
    assert.strictEqual(tr.subject.resolvedName, 'Vellafit');
    assert.strictEqual(tr.subject.officialLegalName, 'VELLAFIT APS');
    assert.strictEqual(tr.subject.country, 'Danmark');

    // Score & Risiko
    assert.ok(tr.trustScore < 70, `Score bør være moderat eller lav pga manglende norsk enhet og uverifiserte krav, fikk ${tr.trustScore}`);
    assert.ok(['MODERAT_RISIKO', 'HOY_RISIKO'].includes(tr.riskLevel));

    // Kategori-breakdown
    assert.ok(
      tr.scoreBreakdown.businessIdentity.score < tr.scoreBreakdown.businessIdentity.maxScore,
      'Selskapsidentitet må ha trekk for manglende norsk registrering'
    );
    assert.ok(
      tr.scoreBreakdown.claimsAndEvidence.score < tr.scoreBreakdown.claimsAndEvidence.maxScore,
      'Påstander må ha trekk for uverifisert nøyaktighetskrav'
    );

    // Dr. Mike
    assert.strictEqual(tr.drMikeMedical.hasMedicalClaims, true);
    assert.ok(tr.drMikeMedical.claims.some((c) => c.verdict === 'INSUFFICIENT_EVIDENCE'));

    // Product & Supply chain
    assert.strictEqual(tr.productSupplyChain.originMatch, 'LIKELY_OEM_FAMILY');

    // Evidenskjede
    assert.ok(tr.evidenceChain.length >= 4, 'Skal ha bevis fra identitet, forbrukervern, produkt og medisin');
    for (const ev of tr.evidenceChain) {
      assert.ok(ev.id, 'Hvert bevis må ha unik ID');
      assert.ok(ev.sourceName, 'Hvert bevis må ha kildenavn');
      assert.ok(ev.retrievedAt, 'Hvert bevis må ha hentetidspunkt');
      assert.ok(['VERIFISERT_FAKTA', 'INFERENS', 'IKKE_VERIFISERT', 'ADVARSEL', 'MOTSTRIDENDE'].includes(ev.verdict));
    }

    // "What we found" og "Watch out"
    assert.ok(tr.whatWeFound.length > 0);
    assert.ok(tr.watchOut.length > 0);
  });
});
