import { randomUUID } from 'crypto';
import {
  AnalyzeRequest,
  FinalAnalysisReport,
  VisionAnalysisResult,
  AssessmentFactor,
  TrafficLightColor,
  RiskLevel,
} from '../types/analysis.types';
import { TrustReport, TimelineEvent } from '../types/trust-report.types';
import { EvidenceObject } from '../types/evidence.types';
import { ScanType } from '../types/purchase-intelligence.types';
import { GeminiService } from './gemini.service';
import { ReputationService } from './reputation.service';
import { ReviewsService } from './reviews.service';
import { EntityResolverService } from './entity-resolver.service';
import { FinancialLookupService } from './financial-lookup.service';
import { ConsumerPolicyService } from './consumer-policy.service';
import { ReviewIntelligenceService } from './review-intelligence.service';
import { ProductIntelligenceService } from './product-intelligence.service';
import { DrMikeService } from './dr-mike.service';
import { TrustScoringService } from './trust-scoring.service';
import { PriceIntelligenceService } from './price-intelligence.service';
import { ModelRouterService } from './model-router.service';
import { CacheService } from './cache.service';
import { EntitlementService } from './entitlement.service';

export class OrchestratorService {
  private geminiService: GeminiService;
  private reputationService: ReputationService;
  private reviewsService: ReviewsService;
  private entityResolver: EntityResolverService;
  private financialLookup: FinancialLookupService;
  private consumerPolicy: ConsumerPolicyService;
  private reviewIntelligence: ReviewIntelligenceService;
  private productIntelligence: ProductIntelligenceService;
  private drMikeService: DrMikeService;
  private trustScoring: TrustScoringService;
  private priceIntelligence: PriceIntelligenceService;

  constructor() {
    this.geminiService = new GeminiService();
    this.reputationService = new ReputationService();
    this.reviewsService = new ReviewsService();
    this.entityResolver = new EntityResolverService();
    this.financialLookup = new FinancialLookupService();
    this.consumerPolicy = new ConsumerPolicyService();
    this.reviewIntelligence = new ReviewIntelligenceService();
    this.productIntelligence = new ProductIntelligenceService();
    this.drMikeService = new DrMikeService();
    this.trustScoring = new TrustScoringService();
    this.priceIntelligence = new PriceIntelligenceService();
  }

  public async analyze(request: AnalyzeRequest): Promise<FinalAnalysisReport> {
    const reportId = randomUUID();
    const now = new Date().toISOString();
    const effectiveScanType: ScanType = request.scanType || 'deep';
    let effectiveQuery = request.query?.trim() || '';

    // 1. Entitlement & Kvotesjekk
    const entitlement = EntitlementService.checkEntitlement(request.userId, effectiveScanType);
    if (!entitlement.allowed) {
      throw new Error(entitlement.reason || 'Kvote overskredet for denne analysetypen.');
    }
    EntitlementService.recordScanUsage(request.userId, effectiveScanType);

    // 2. Initialiser Model Router & Cost Observability for denne sesjonen
    const modelRouter = new ModelRouterService(reportId, effectiveScanType, request.userId);

    // 3. Cache-oppslag (Report Cache)
    const cacheKey = `${effectiveQuery || 'img'}_${request.standaloneDrMike ? 'drmike' : 'std'}`;
    const cached = CacheService.getReport<FinalAnalysisReport>(cacheKey, effectiveScanType);
    if (cached) {
      modelRouter.recordCacheHit();
      const cachedReport = cached.data;
      if (cachedReport.trustReport) {
        cachedReport.trustReport.costObservability = {
          ...cachedReport.trustReport.costObservability!,
          cacheHits: 1,
          cacheMisses: 0,
        };
      }
      return cachedReport;
    }
    modelRouter.recordCacheMiss();

    // 4. Visjonsanalyse hvis bilde er vedlagt
    let visionResult: VisionAnalysisResult | undefined;
    if (request.image) {
      modelRouter.recordImageAnalysis(false);
      visionResult = await this.geminiService.analyzeImage(
        request.image,
        request.mimeType || 'image/jpeg'
      );
      // Registrer standard tokenbruk for visjonsmodell (Gemini 2.5 Flash)
      modelRouter.recordModelUsage('gemini-2.5-flash', 1100, 320, 'companyCostUsd');

      if (!effectiveQuery) {
        if (visionResult.detectedOrgNumbers && visionResult.detectedOrgNumbers.length > 0) {
          effectiveQuery = visionResult.detectedOrgNumbers[0];
        } else if (visionResult.detectedUrls && visionResult.detectedUrls.length > 0) {
          effectiveQuery = visionResult.detectedUrls[0];
        } else if (visionResult.identifiedBrands && visionResult.identifiedBrands.length > 0) {
          effectiveQuery = visionResult.identifiedBrands[0];
        }
      }
    }

    const fullContextText = `${effectiveQuery} ${visionResult?.extractedText || ''} ${visionResult?.summaryOfContent || ''}`.trim();

    // 5. Standalone Dr. Mike Modus (dersom brukeren kun sjekker et helseprodukt/annonse)
    if (request.standaloneDrMike) {
      return this.handleStandaloneDrMike(
        reportId,
        now,
        fullContextText,
        visionResult,
        modelRouter,
        effectiveScanType,
        cacheKey
      );
    }

    // 6. Domenekandidat
    const domainCandidate =
      (visionResult?.detectedUrls && visionResult.detectedUrls[0]) ||
      (this.looksLikeUrl(effectiveQuery) ? effectiveQuery : undefined);

    // 7. Entity Resolution (Brreg, CVR, NUF, merkevarer)
    modelRouter.recordExternalApiCall('Brreg/Registry Lookup', 'companyCostUsd');
    const resolvedEntity = await this.entityResolver.resolve(effectiveQuery, domainCandidate);

    const detectedProduct =
      visionResult?.identifiedBrands?.find(
        (b) => b.toLowerCase() !== resolvedEntity.resolvedName.toLowerCase()
      ) || undefined;

    // 8. Multi-source innhenting
    // For Fast Scan henter vi lettvektsdata, for Deep Scan henter vi full substans og anmeldelser
    const isDeep = effectiveScanType === 'deep';

    modelRouter.recordExternalApiCall('Google/Trustpilot Reviews', 'reviewsCostUsd');
    const [financialsResult, reviewsResult, reputationResult] = await Promise.all([
      isDeep
        ? this.financialLookup.lookupFinancials(
            resolvedEntity.orgNumber,
            resolvedEntity.brreg?.entity?.antallAnsatte
          )
        : Promise.resolve({
            financials: {
              status: 'BEGRENSET' as const,
              summary: 'Fast Scan: Dybdegående regnskapstall utelatt for raskere responstid.',
              accountingNotes: [],
            },
            evidence: [],
          }),
      this.reviewsService.checkReviews(
        effectiveQuery,
        domainCandidate || resolvedEntity.domain,
        resolvedEntity.resolvedName
      ),
      this.reputationService.checkReputation(
        resolvedEntity.resolvedName,
        visionResult?.extractedText
      ),
    ]);

    // 9. Consumer Policy Audit
    const consumerResult = this.consumerPolicy.analyzePolicies(
      fullContextText,
      resolvedEntity.domain
    );

    // 10. Review Intelligence & NLP Similarity Anomaly Engine
    const reviewIntelResult = this.reviewIntelligence.analyzeReviews(
      reviewsResult.google,
      reviewsResult.trustpilot,
      []
    );
    modelRouter.recordModelUsage('gemini-2.5-flash', 820, 290, 'reviewsCostUsd');

    // 11. Product & Supply Chain / OEM Profiler
    const productResult = this.productIntelligence.analyzeProduct(
      detectedProduct,
      fullContextText
    );
    modelRouter.recordModelUsage('gemini-2.5-flash', 650, 210, 'productCostUsd');

    const isOem = productResult.report.originMatch === 'LIKELY_OEM_FAMILY';

    // 12. Price & Alternative Intelligence
    const priceResult = isDeep
      ? this.priceIntelligence.analyzePriceAndAlternatives(
          fullContextText,
          productResult.report.detectedProductName,
          isOem
        )
      : {
          priceIntelligence: {
            hasPriceAnalysis: false,
            priceVerdict: 'UNABLE_TO_DETERMINE' as const,
            alternativeCandidates: [],
            importantNotice: 'Fast Scan: Prissammenligning utelatt.',
          },
          evidence: [],
        };
    if (isDeep && priceResult.priceIntelligence.hasPriceAnalysis) {
      modelRouter.recordModelUsage('gemini-2.5-flash', 500, 180, 'priceCostUsd');
    }

    // 13. Dr. Mike Medical Evidence Verification Engine
    const drMikeResult = this.drMikeService.verifyClaims(
      fullContextText,
      visionResult?.detectedHealthClaims || []
    );

    if (drMikeResult.report.hasMedicalClaims) {
      modelRouter.recordModelUsage('gemini-2.5-flash', 940, 360, 'claimsCostUsd');

      // Model Router Escalation Decision:
      // Hvis det foreligger alvorlig motsagte helsepåstander (Level A motbevis),
      // eskaleres arbeidslasten formelt til Gemini Pro for presis begrunnelse.
      const hasContradiction = drMikeResult.report.claims.some(
        (c) => c.verdict === 'EVIDENCE_CONTRADICTS_CLAIM'
      );
      if (hasContradiction) {
        modelRouter.selectModel({
          workload: 'MEDICAL_CONTRADICTION_AUDIT',
          prompt: fullContextText,
          module: 'drMikeCostUsd',
          forceEscalation: true,
          escalationReason:
            'Eskalert til Pro-modell: Funnet alvorlig motstrid mellom markedsføring og Level A-konsensus (Cochrane/WHO/EFSA).',
        });
      }
    }

    // 14. Samle den komplette beviskjeden (Evidence Chain)
    const evidenceChain: EvidenceObject[] = [
      ...resolvedEntity.evidence,
      ...financialsResult.evidence,
      ...consumerResult.evidence,
      ...reviewIntelResult.evidence,
      ...productResult.evidence,
      ...priceResult.evidence,
      ...drMikeResult.evidence,
    ];

    if (reputationResult.consumerWarningFound) {
      evidenceChain.push({
        id: `ev-external-warning-${reportId}`,
        category: 'EXTERNAL_RISK',
        claim: 'Varsellister og offentlige advarsler',
        finding: reputationResult.notes.join(' '),
        verdict: 'ADVARSEL',
        sourceName: reputationResult.warningSources.join(', ') || 'Forbrukertilsynet',
        sourceType: 'EKSTERN_LISTE',
        retrievedAt: now,
        confidence: 'HIGH',
      });
    }

    // 15. Transparent Trust Scoring & Confidence Calculation
    const scoringResult = this.trustScoring.calculateScore({
      isRegisteredCompany: resolvedEntity.isRegisteredInNorway,
      isBankruptOrLiquidating: resolvedEntity.brreg?.isDissolvedOrBankrupt || false,
      financialStatus: financialsResult.financials.status,
      hasActiveDnsAndHttps: resolvedEntity.domainCheck?.dnsResolved || true,
      suspiciousDomainFlagsCount: resolvedEntity.domainCheck?.flags.length || 0,
      consumerProtectionStatus: consumerResult.audit.status,
      reviewAverage: reviewIntelResult.report.averageRating,
      reviewCount: reviewIntelResult.report.totalReviewCount,
      hasReviewSimilarityAnomaly: reviewIntelResult.report.similarityAnomaly.detected,
      hasProductAnalysis: productResult.report.hasProductAnalysis,
      isOemCategory: isOem,
      medicalClaimsContradicted: drMikeResult.report.claims.some(
        (c) => c.verdict === 'EVIDENCE_CONTRADICTS_CLAIM'
      ),
      medicalClaimsUnverified: drMikeResult.report.claims.some(
        (c) => c.verdict === 'INSUFFICIENT_EVIDENCE'
      ),
      externalScamWarningFound: reputationResult.consumerWarningFound,
      evidenceChain,
    });

    // 16. Syntetiser helhetlig "AI Purchase Verdict"
    const purchaseVerdict = this.priceIntelligence.synthesizePurchaseVerdict({
      trustScore: scoringResult.trustScore,
      riskLevel: scoringResult.riskLevel,
      priceVerdict: priceResult.priceIntelligence.priceVerdict,
      hasReviewAnomaly: reviewIntelResult.report.similarityAnomaly.detected,
      totalReviews: reviewIntelResult.report.totalReviewCount,
      isOemProduct: isOem,
      hasContradictedMedicalClaims: drMikeResult.report.claims.some(
        (c) => c.verdict === 'EVIDENCE_CONTRADICTS_CLAIM'
      ),
      hasUnverifiedMedicalClaims: drMikeResult.report.claims.some(
        (c) => c.verdict === 'INSUFFICIENT_EVIDENCE'
      ),
      drMikeSummary: drMikeResult.report.doctorSummary,
    });

    // 17. Bygg "What we found" og "Watch out"
    const whatWeFound: string[] = [];
    const watchOut: string[] = [];

    for (const ev of evidenceChain) {
      if (ev.verdict === 'VERIFISERT_FAKTA' && whatWeFound.length < 5) {
        whatWeFound.push(ev.finding);
      } else if (ev.verdict === 'ADVARSEL' && watchOut.length < 5) {
        watchOut.push(ev.finding);
      }
    }

    if (whatWeFound.length === 0) {
      whatWeFound.push('Virksomhetsinformasjon innhentet fra tilgjengelige kilder.');
    }
    if (watchOut.length === 0) {
      watchOut.push('Ingen kritiske faresignaler eller alvorlige avvik observert.');
    }

    // 18. Tidslinje
    const timeline: TimelineEvent[] = [];
    if (resolvedEntity.brreg?.entity?.stiftelsesdato) {
      timeline.push({
        yearOrDate: resolvedEntity.brreg.entity.stiftelsesdato.split('-')[0],
        title: 'Virksomhet stiftet',
        description: `Formelt stiftet og registrert som ${resolvedEntity.brreg.entity.organisasjonsform?.beskrivelse || 'foretak'}.`,
        verified: true,
      });
    }
    if (resolvedEntity.brreg?.isRegisteredInMva) {
      timeline.push({
        yearOrDate: 'MVA',
        title: 'MVA-registrert',
        description: 'Registrert i Merverdiavgiftsregisteret for ordinær omsetning.',
        verified: true,
      });
    }
    timeline.push({
      yearOrDate: 'I dag',
      title: 'Trust Scanner analyse',
      description: `Gjennomført ${effectiveScanType === 'fast' ? 'Fast Scan' : 'Deep Scan'} kildesjekk (${scoringResult.confidence.verifiedCategoriesCount}/8 kategorier).`,
      verified: true,
    });

    // 19. Generer observability-rapport
    const costObservability = modelRouter.getObservabilityReport();

    // 20. Komplett Trust Report
    const trustReport: TrustReport = {
      id: reportId,
      analyzedAt: now,
      subject: {
        query: effectiveQuery,
        resolvedName: resolvedEntity.resolvedName,
        officialLegalName: resolvedEntity.officialLegalName,
        orgNumber: resolvedEntity.orgNumber,
        country: resolvedEntity.country,
        websiteUrl: resolvedEntity.domain,
        registeredAddress: resolvedEntity.brreg?.entity?.postadresse?.adresse?.join(', '),
        establishedYear: resolvedEntity.brreg?.entity?.stiftelsesdato?.split('-')[0],
      },
      trustScore: scoringResult.trustScore,
      riskLevel: scoringResult.riskLevel,
      confidence: scoringResult.confidence,
      scoreBreakdown: scoringResult.breakdown,
      executiveSummary: `${resolvedEntity.resolvedName} oppnår en Trust Score på ${scoringResult.trustScore} av 100 (${this.formatRiskLabel(scoringResult.riskLevel)}). ${scoringResult.confidence.explanation}`,
      whatWeFound,
      watchOut,
      hardRedFlags: scoringResult.hardRedFlags,
      timeline,
      financialSubstance: financialsResult.financials,
      consumerProtection: consumerResult.audit,
      reviewIntelligence: reviewIntelResult.report,
      productSupplyChain: productResult.report,
      marketingClaims: [],
      drMikeMedical: drMikeResult.report,
      priceIntelligence: priceResult.priceIntelligence,
      purchaseVerdict,
      scanType: effectiveScanType,
      costObservability,
      evidenceChain,
    };

    // 21. Bakoverkompatible felt for FinalAnalysisReport
    const legacyRiskFactors: AssessmentFactor[] = watchOut.map((item) => ({
      title: 'Observasjon',
      description: item,
      severity: scoringResult.riskLevel === 'HOY_RISIKO' || scoringResult.riskLevel === 'KRITISK_RISIKO' ? 'danger' : 'warning',
    }));

    const legacyPositiveFactors: AssessmentFactor[] = whatWeFound.map((item) => ({
      title: 'Bekreftet fakta',
      description: item,
      severity: 'info',
    }));

    let trafficLight: TrafficLightColor = 'GREEN';
    let legacyRiskLevel: RiskLevel = 'LAV';
    if (scoringResult.trustScore < 40) {
      trafficLight = 'RED';
      legacyRiskLevel = 'HØY';
    } else if (scoringResult.trustScore < 70) {
      trafficLight = 'YELLOW';
      legacyRiskLevel = 'MODERAT';
    }

    const finalReport: FinalAnalysisReport = {
      id: reportId,
      analyzedAt: now,
      score: scoringResult.trustScore,
      trafficLight,
      riskLevel: legacyRiskLevel,
      headline: `${resolvedEntity.resolvedName} – ${this.formatRiskLabel(scoringResult.riskLevel)} (${scoringResult.trustScore}/100)`,
      executiveSummary: trustReport.executiveSummary,
      riskFactors: legacyRiskFactors,
      positiveFactors: legacyPositiveFactors,
      actionableAdvice: this.generateActionableAdvice(scoringResult.riskLevel, consumerResult.audit.withdrawalPeriodDays),
      identifiedSubject: {
        name: resolvedEntity.resolvedName,
        legalName: resolvedEntity.officialLegalName,
        tradeName: resolvedEntity.resolvedName,
        orgNumber: resolvedEntity.orgNumber,
        websiteUrl: resolvedEntity.domain,
        detectedProduct,
      },
      brreg: resolvedEntity.brreg,
      domain: resolvedEntity.domainCheck,
      vision: visionResult,
      reputation: reputationResult,
      reviews: reviewsResult,
      medicalReview: drMikeResult.report.hasMedicalClaims
        ? {
            hasMedicalClaims: true,
            doctorSummary: drMikeResult.report.doctorSummary,
            overallVerdict: drMikeResult.report.overallDoctorVerdict,
            claims: drMikeResult.report.claims.map((c) => ({
              claim: c.claim,
              verdict: c.verdict === 'EVIDENCE_CONTRADICTS_CLAIM' ? 'MYTE' : c.verdict === 'STRONG_EVIDENCE' ? 'DOKUMENTERT' : 'UDOKUMENTERT',
              scientificExplanation: c.whatTheEvidenceSays,
              evidenceLevel: 'Ingen påvist effekt',
              sourcesOrConsensus: c.sources,
            })),
            disclaimer: drMikeResult.report.disclaimer,
          }
        : undefined,
      trustReport,
    };

    // 22. Lagre i Report Cache
    CacheService.setReport(cacheKey, effectiveScanType, finalReport);

    return finalReport;
  }

  private handleStandaloneDrMike(
    reportId: string,
    now: string,
    fullContextText: string,
    visionResult: VisionAnalysisResult | undefined,
    modelRouter: ModelRouterService,
    scanType: ScanType,
    cacheKey: string
  ): FinalAnalysisReport {
    const drMikeResult = this.drMikeService.verifyClaims(
      fullContextText,
      visionResult?.detectedHealthClaims || []
    );
    modelRouter.recordModelUsage('gemini-2.5-flash', 1150, 420, 'drMikeCostUsd');

    const productResult = this.productIntelligence.analyzeProduct(
      visionResult?.identifiedBrands?.[0] || 'Helse- eller velværeprodukt',
      fullContextText
    );

    const evidenceChain: EvidenceObject[] = [
      ...productResult.evidence,
      ...drMikeResult.evidence,
    ];

    const hasContradiction = drMikeResult.report.claims.some(
      (c) => c.verdict === 'EVIDENCE_CONTRADICTS_CLAIM'
    );
    const score = hasContradiction ? 35 : drMikeResult.report.claims.length > 0 ? 55 : 75;
    const riskLevel: TrustReport['riskLevel'] = hasContradiction ? 'HOY_RISIKO' : 'MODERAT_RISIKO';

    const costObservability = modelRouter.getObservabilityReport();

    const trustReport: TrustReport = {
      id: reportId,
      analyzedAt: now,
      subject: {
        query: fullContextText.substring(0, 80),
        resolvedName: visionResult?.identifiedBrands?.[0] || 'Undersøkt helseprodukt/påstand',
        officialLegalName: 'Produktgransking (Dr. Mike)',
        country: 'Norge',
      },
      trustScore: score,
      riskLevel,
      confidence: {
        level: 'HIGH',
        verifiedCategoriesCount: 2,
        totalCategoriesCount: 2,
        explanation: 'Fokusert medisinsk og fysiologisk faktasjekk etter evidenspyramiden.',
      },
      scoreBreakdown: {
        businessIdentity: { score: 0, maxScore: 0, weightPercentage: 0, evaluated: false, summary: 'Ikke evaluert i Standalone Dr. Mike' },
        financialFootprint: { score: 0, maxScore: 0, weightPercentage: 0, evaluated: false, summary: 'Ikke evaluert i Standalone Dr. Mike' },
        digitalIdentity: { score: 0, maxScore: 0, weightPercentage: 0, evaluated: false, summary: 'Ikke evaluert i Standalone Dr. Mike' },
        consumerProtection: { score: 0, maxScore: 0, weightPercentage: 0, evaluated: false, summary: 'Ikke evaluert i Standalone Dr. Mike' },
        reviews: { score: 0, maxScore: 0, weightPercentage: 0, evaluated: false, summary: 'Ikke evaluert i Standalone Dr. Mike' },
        productTransparency: { score: 8, maxScore: 10, weightPercentage: 20, evaluated: true, summary: productResult.report.originExplanation },
        claimsAndEvidence: { score: score > 50 ? 8 : 3, maxScore: 10, weightPercentage: 80, evaluated: true, summary: drMikeResult.report.doctorSummary },
        externalRiskSignals: { score: 5, maxScore: 5, weightPercentage: 0, evaluated: true, summary: 'Ingen registeradvarsler sjekket' },
      },
      executiveSummary: drMikeResult.report.doctorSummary || 'Medisinsk vurdering gjennomført.',
      whatWeFound: drMikeResult.report.claims.map((c) => `${c.claim}: ${c.whatTheEvidenceSays}`).slice(0, 3),
      watchOut: drMikeResult.report.claims.filter((c) => c.importantLimitation).map((c) => c.importantLimitation!).slice(0, 3),
      hardRedFlags: [],
      timeline: [],
      financialSubstance: { status: 'INGEN_DATA', summary: 'Ikke relevant for standalone produktgransking', accountingNotes: [] },
      consumerProtection: { status: 'MANGLER', summary: 'Ikke vurdert', hasPhysicalReturnAddress: false, vatAndDutiesIncluded: false, paymentMethods: [], hasCryptoOnlyWarning: false, termsContradictions: [] },
      reviewIntelligence: { totalReviewCount: 0, averageRating: 0, ratingDistribution: { fiveStarPct: 0, fourStarPct: 0, threeStarPct: 0, twoStarPct: 0, oneStarPct: 0 }, reviewVelocity: { last30DaysCount: 0, last90DaysCount: 0, hasUnusualSpike: false }, clusters: { praised: [], complained: [] }, similarityAnomaly: { detected: false, similarityScore: 0, similarityLevel: 'INGEN', explanation: '' } },
      productSupplyChain: productResult.report,
      marketingClaims: [],
      drMikeMedical: drMikeResult.report,
      scanType,
      costObservability,
      evidenceChain,
    };

    const finalReport: FinalAnalysisReport = {
      id: reportId,
      analyzedAt: now,
      score,
      trafficLight: hasContradiction ? 'RED' : 'YELLOW',
      riskLevel: hasContradiction ? 'HØY' : 'MODERAT',
      headline: `Dr. Mike Medisinsk Vurdering: ${drMikeResult.report.overallDoctorVerdict || 'Gjennomført'}`,
      executiveSummary: drMikeResult.report.doctorSummary,
      riskFactors: trustReport.watchOut.map((w) => ({ title: 'Medisinsk advarsel', description: w, severity: 'warning' })),
      positiveFactors: trustReport.whatWeFound.map((wf) => ({ title: 'Vitenskapelig dokumentasjon', description: wf, severity: 'info' })),
      actionableAdvice: [
        'Rådfør deg alltid med lege før oppstart av nye kosttilskudd eller behandlingsapparater.',
        'Sjekk Legemiddelverket eller EFSA for godkjente helsepåstander.',
      ],
      identifiedSubject: {
        name: trustReport.subject.resolvedName,
      },
      medicalReview: {
        hasMedicalClaims: true,
        doctorSummary: drMikeResult.report.doctorSummary,
        overallVerdict: drMikeResult.report.overallDoctorVerdict,
        claims: drMikeResult.report.claims.map((c) => ({
          claim: c.claim,
          verdict: c.verdict === 'EVIDENCE_CONTRADICTS_CLAIM' ? 'MYTE' : c.verdict === 'STRONG_EVIDENCE' ? 'DOKUMENTERT' : 'UDOKUMENTERT',
          scientificExplanation: c.whatTheEvidenceSays,
          evidenceLevel: 'Ingen påvist effekt',
          sourcesOrConsensus: c.sources,
        })),
        disclaimer: drMikeResult.report.disclaimer,
      },
      trustReport,
    };

    CacheService.setReport(cacheKey, scanType, finalReport);
    return finalReport;
  }

  private looksLikeUrl(text: string): boolean {
    return /^https?:\/\//i.test(text) || /\.[a-z]{2,}(\/|$)/i.test(text);
  }

  private formatRiskLabel(risk: TrustReport['riskLevel']): string {
    switch (risk) {
      case 'LAV_RISIKO':
        return 'Lav risiko';
      case 'MODERAT_RISIKO':
        return 'Moderat risiko';
      case 'HOY_RISIKO':
        return 'Høy risiko';
      case 'KRITISK_RISIKO':
        return 'Kritisk risiko';
    }
  }

  private generateActionableAdvice(risk: TrustReport['riskLevel'], returnDays?: number): string[] {
    const advice: string[] = [];
    if (risk === 'LAV_RISIKO') {
      advice.push('Virksomheten fremstår etablert med transparente selskapsdata og godkjenninger.');
      advice.push(`Benytt ordinære forbrukerrettigheter (${returnDays || 14} dagers returrett gjelder).`);
    } else if (risk === 'MODERAT_RISIKO') {
      advice.push('Betal alltid med kredittkort eller Klarna for å beholde reklamasjonsvern.');
      advice.push('Vær oppmerksom på markedsføringspåstander og sjekk returvilkårene nøye før kjøp.');
    } else {
      advice.push('Unngå forskuddsbetaling eller overføring via krypto/bankoverføring.');
      advice.push('Ikke oppgi personopplysninger eller BankID til uverifiserte aktører.');
    }
    return advice;
  }
}
