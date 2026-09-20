import test from 'node:test';
import assert from 'node:assert';
import { ModelRouterService } from './services/model-router.service';
import { CacheService } from './services/cache.service';
import { EntitlementService } from './services/entitlement.service';
import { PriceIntelligenceService } from './services/price-intelligence.service';
import { OrchestratorService } from './services/orchestrator.service';

test('AI Purchase Intelligence Architecture & Engine Tests', async (t) => {
  await t.test('1. Model Router: Ruter lette oppgaver til Flash-Lite, standard til Flash og eskalering til Pro', () => {
    const router = new ModelRouterService('test-scan-1', 'deep');

    // Lette oppgaver
    const cheapRoute = router.selectModel({
      workload: 'URL_EXTRACTION',
      prompt: 'Finn nettadresse',
      module: 'companyCostUsd',
    });
    assert.strictEqual(cheapRoute.modelName, 'gemini-2.5-flash-lite');
    assert.strictEqual(cheapRoute.tier, 'CHEAP');

    // Standard oppgaver
    const defaultRoute = router.selectModel({
      workload: 'COMPANY_ANALYSIS',
      prompt: 'Analyser selskap',
      module: 'companyCostUsd',
    });
    assert.strictEqual(defaultRoute.modelName, 'gemini-2.5-flash');
    assert.strictEqual(defaultRoute.tier, 'DEFAULT');

    // Eskalering ved motstridende kilder
    const escalatedRoute = router.selectModel({
      workload: 'MEDICAL_CONTRADICTION_AUDIT',
      prompt: 'Gransk motstrid',
      module: 'drMikeCostUsd',
      escalationReason: 'Klinisk motstrid med Cochrane-oversikt',
    });
    assert.strictEqual(escalatedRoute.modelName, 'gemini-1.5-pro');
    assert.strictEqual(escalatedRoute.tier, 'ESCALATION');

    // Registrer tokenbruk og verifiser observability rapport
    router.recordModelUsage('gemini-2.5-flash', 2000, 500, 'companyCostUsd');
    router.recordExternalApiCall('Brreg', 'companyCostUsd');
    router.recordSearchCall();
    router.recordCacheHit();
    router.recordCacheMiss();

    const report = router.getObservabilityReport();
    assert.strictEqual(report.scanId, 'test-scan-1');
    assert.strictEqual(report.modelCalls, 1);
    assert.strictEqual(report.inputTokens, 2000);
    assert.strictEqual(report.outputTokens, 500);
    assert.ok(report.estimatedCostUsd > 0);
    assert.ok(report.estimatedCostNok > 0);
    assert.strictEqual(report.cacheHits, 1);
    assert.strictEqual(report.cacheMisses, 1);
    assert.strictEqual(report.escalationDecision?.escalated, true);
    assert.ok(report.escalationDecision?.reason?.includes('Cochrane'));
  });

  await t.test('2. Tiered Cache: Gjenbruker selskaps- og rapportdata med TTL', () => {
    CacheService.clearAll();

    // Entity cache
    CacheService.setEntity('vellafit', { orgName: 'VELLAFIT APS' });
    const cachedEntity = CacheService.getEntity<{ orgName: string }>('vellafit');
    assert.ok(cachedEntity);
    assert.strictEqual(cachedEntity?.data.orgName, 'VELLAFIT APS');

    // Report cache
    CacheService.setReport('vellafit.no', 'fast', { score: 62 });
    const cachedReport = CacheService.getReport<{ score: number }>('vellafit.no', 'fast');
    assert.ok(cachedReport);
    assert.strictEqual(cachedReport?.data.score, 62);

    // Ikke-eksisterende nøkkel
    const missing = CacheService.getEntity('ukjent_foretak_123');
    assert.strictEqual(missing, undefined);
  });

  await t.test('3. Entitlements & Feature Flags: Håndterer planer, kvoter og funksjonsbrytere', () => {
    // Feature flags
    assert.strictEqual(EntitlementService.isFeatureEnabled('drMikeEnabled'), true);
    assert.strictEqual(EntitlementService.isFeatureEnabled('subscriptionsEnabled'), false);

    // Kvotesjekk når subscriptionsEnabled = false (alle tillates)
    const resultDefault = EntitlementService.checkEntitlement('user-1', 'deep', 'FREE');
    assert.strictEqual(resultDefault.allowed, true);

    // Aktiver subscriptionsEnabled midlertidig for å teste kvotegrenser
    EntitlementService.updateFeatureFlags({ subscriptionsEnabled: true });
    EntitlementService.updateTierLimits('FREE', { monthlyDeepScans: 2 });

    const check1 = EntitlementService.checkEntitlement('user-test-quota', 'deep', 'FREE');
    assert.strictEqual(check1.allowed, true);

    EntitlementService.recordScanUsage('user-test-quota', 'deep', 'FREE');
    EntitlementService.recordScanUsage('user-test-quota', 'deep', 'FREE');

    const checkBlocked = EntitlementService.checkEntitlement('user-test-quota', 'deep', 'FREE');
    assert.strictEqual(checkBlocked.allowed, false);
    assert.ok(checkBlocked.reason?.includes('kvote'));

    // Tilbakestill feature flags for produksjon
    EntitlementService.updateFeatureFlags({ subscriptionsEnabled: false });
  });

  await t.test('4. Price & Purchase Intelligence: Avdekker overpris i OEM-kategorier og syntetiserer verdict', () => {
    const priceService = new PriceIntelligenceService();

    // Vurder en smartvekt som selges til 1999 kr (OEM-benchmark er 399–799 kr)
    const contextText = 'Vellafit Smart Vekt pris: 1 999 kr kroppsskanner med bioimpedans';
    const { priceIntelligence, evidence } = priceService.analyzePriceAndAlternatives(
      contextText,
      'Vellafit Smart Vekt',
      true
    );

    assert.strictEqual(priceIntelligence.hasPriceAnalysis, true);
    assert.strictEqual(priceIntelligence.sellerPrice?.amount, 1999);
    assert.ok(priceIntelligence.priceDifferencePercentage! > 100);
    assert.strictEqual(priceIntelligence.priceVerdict, 'POTENTIALLY_POOR_VALUE');
    assert.ok(priceIntelligence.alternativeCandidates.length >= 1);
    assert.ok(evidence.some((e) => e.finding.includes('høyere enn sammenlignbare')));

    // Test syntetisering av Purchase Verdict (5 spørsmål)
    const verdict = priceService.synthesizePurchaseVerdict({
      trustScore: 58,
      riskLevel: 'MODERAT_RISIKO',
      priceVerdict: priceIntelligence.priceVerdict,
      hasReviewAnomaly: true,
      totalReviews: 45,
      isOemProduct: true,
      hasContradictedMedicalClaims: false,
      hasUnverifiedMedicalClaims: true,
      drMikeSummary: 'BIA måler motstand, ikke direkte fettprosent.',
    });

    assert.strictEqual(verdict.canITrustThis, 'MODERAT_RISIKO');
    assert.strictEqual(verdict.isItGoodValue, 'POTENTIALLY_POOR_VALUE');
    assert.strictEqual(verdict.reviewsSummary, 'ANOMALIES_DETECTED');
    assert.strictEqual(verdict.productTransparency, 'LIKELY_OEM_PRIVATE_LABEL');
    assert.strictEqual(verdict.claimVerification, 'LIMITED_EVIDENCE');
    assert.ok(verdict.summaryHeadline.includes('lav verdi'));
  });

  await t.test('5. Standalone Dr. Mike Mode: Utfører direkte medisinsk faktasjekk uten selskapsidentitet', async () => {
    const orchestrator = new OrchestratorService();

    const report = await orchestrator.analyze({
      query: 'Detox te fjerner giftstoffer og forbrenner magefett over natten',
      standaloneDrMike: true,
    });

    assert.ok(report.trustReport, 'Må returnere trustReport');
    const tr = report.trustReport;

    assert.strictEqual(tr.drMikeMedical.hasMedicalClaims, true);
    assert.ok(tr.drMikeMedical.claims.length >= 1);
    assert.strictEqual(tr.subject.officialLegalName, 'Produktgransking (Dr. Mike)');
    assert.ok(tr.costObservability);
    assert.strictEqual(tr.costObservability.scanType, 'deep');
    assert.ok(tr.costObservability.modelCalls >= 1);
  });

  await t.test('6. Fast Scan vs Deep Scan: Fast Scan leverer rask selskaps- og domenerapport', async () => {
    const orchestrator = new OrchestratorService();

    const fastReport = await orchestrator.analyze({
      query: 'Vellafit https://vellafit.no',
      scanType: 'fast',
    });

    assert.ok(fastReport.trustReport);
    assert.strictEqual(fastReport.trustReport.scanType, 'fast');
    assert.strictEqual(fastReport.trustReport.subject.resolvedName, 'Vellafit');
    assert.ok(fastReport.trustReport.costObservability);
    assert.strictEqual(fastReport.trustReport.costObservability.scanType, 'fast');
    // Fast scan skal ha begrenset regnskapssammendrag
    assert.strictEqual(fastReport.trustReport.financialSubstance.status, 'BEGRENSET');
  });
});
