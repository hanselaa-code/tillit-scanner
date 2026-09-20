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
  }

  public async analyze(request: AnalyzeRequest): Promise<FinalAnalysisReport> {
    const reportId = randomUUID();
    const now = new Date().toISOString();
    let visionResult: VisionAnalysisResult | undefined;
    let effectiveQuery = request.query?.trim() || '';

    // 1. Visjonsanalyse hvis bilde er vedlagt
    if (request.image) {
      visionResult = await this.geminiService.analyzeImage(
        request.image,
        request.mimeType || 'image/jpeg'
      );

      // Hvis brukeren ikke tastet inn en forespørsel manuelt, utled det fra bildeanalysen
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

    // 2. Domenekandidat
    const domainCandidate =
      (visionResult?.detectedUrls && visionResult.detectedUrls[0]) ||
      (this.looksLikeUrl(effectiveQuery) ? effectiveQuery : undefined);

    // 3. Entity Resolution: Bygg helhetlig selskapsentitet og samle primære bevis
    const resolvedEntity = await this.entityResolver.resolve(effectiveQuery, domainCandidate);

    const detectedProduct =
      visionResult?.identifiedBrands?.find(
        (b) => b.toLowerCase() !== resolvedEntity.resolvedName.toLowerCase()
      ) || undefined;

    const fullContextText = `${effectiveQuery} ${visionResult?.extractedText || ''} ${visionResult?.summaryOfContent || ''}`.trim();

    // 4. Parallell multi-source innhenting
    const [financialsResult, reviewsResult, reputationResult] = await Promise.all([
      this.financialLookup.lookupFinancials(
        resolvedEntity.orgNumber,
        resolvedEntity.brreg?.entity?.antallAnsatte
      ),
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

    // 5. Consumer Policy Audit
    const consumerResult = this.consumerPolicy.analyzePolicies(
      fullContextText,
      resolvedEntity.domain
    );

    // 6. Review Intelligence & NLP Similarity Engine
    const reviewIntelResult = this.reviewIntelligence.analyzeReviews(
      reviewsResult.google,
      reviewsResult.trustpilot,
      []
    );

    // 7. Product & Supply Chain / OEM Profiler
    const productResult = this.productIntelligence.analyzeProduct(
      detectedProduct,
      fullContextText
    );

    // 8. Dr. Mike Medical Evidence Verification Engine
    const drMikeResult = this.drMikeService.verifyClaims(
      fullContextText,
      visionResult?.detectedHealthClaims || []
    );

    // 9. Samle den komplette beviskjeden (Evidence Chain)
    const evidenceChain: EvidenceObject[] = [
      ...resolvedEntity.evidence,
      ...financialsResult.evidence,
      ...consumerResult.evidence,
      ...reviewIntelResult.evidence,
      ...productResult.evidence,
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

    // 10. Transparent Trust Scoring & Confidence Calculation
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
      isOemCategory: productResult.report.originMatch === 'LIKELY_OEM_FAMILY',
      medicalClaimsContradicted: drMikeResult.report.claims.some(
        (c) => c.verdict === 'EVIDENCE_CONTRADICTS_CLAIM'
      ),
      medicalClaimsUnverified: drMikeResult.report.claims.some(
        (c) => c.verdict === 'INSUFFICIENT_EVIDENCE'
      ),
      externalScamWarningFound: reputationResult.consumerWarningFound,
      evidenceChain,
    });

    // 11. Bygg "What we found" og "Watch out"
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

    // 12. Tidslinje
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
      description: `Gjennomført uavhengig verifisering og kildesjekk (${scoringResult.confidence.verifiedCategoriesCount}/8 kategorier).`,
      verified: true,
    });

    // 13. Bygg komplett Trust Report
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
      evidenceChain,
    };

    // 14. Bakoverkompatible felt for FinalAnalysisReport
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

    return {
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
