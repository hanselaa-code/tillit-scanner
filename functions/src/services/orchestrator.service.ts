import { randomUUID } from 'crypto';
import { AnalyzeRequest, FinalAnalysisReport, VisionAnalysisResult } from '../types/analysis.types';
import { GeminiService } from './gemini.service';
import { BrregService } from './brreg.service';
import { DomainService } from './domain.service';
import { ReputationService } from './reputation.service';
import { ReviewsService } from './reviews.service';

export class OrchestratorService {
  private geminiService: GeminiService;
  private brregService: BrregService;
  private domainService: DomainService;
  private reputationService: ReputationService;
  private reviewsService: ReviewsService;

  constructor() {
    this.geminiService = new GeminiService();
    this.brregService = new BrregService();
    this.domainService = new DomainService();
    this.reputationService = new ReputationService();
    this.reviewsService = new ReviewsService();
  }

  public async analyze(request: AnalyzeRequest): Promise<FinalAnalysisReport> {
    const reportId = randomUUID();
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

    // 2. Utled URL eller Brreg-søkeord
    const domainCandidate = 
      (visionResult?.detectedUrls && visionResult.detectedUrls[0]) ||
      (this.looksLikeUrl(effectiveQuery) ? effectiveQuery : undefined);

    // Hvis vi har et domene, f.eks. "www.kicks.no", hent ut stammen "kicks"
    let domainBrandStem = '';
    if (domainCandidate) {
      const cleanDomain = this.domainService.extractDomain(domainCandidate);
      if (cleanDomain) {
        const parts = cleanDomain.replace(/^www\./i, '').split('.');
        if (parts.length >= 2) {
          domainBrandStem = parts[0];
        }
      }
    }

    // Finn beste Brreg-kandidat med smart prioritering:
    // 1. Organisasjonsnummer fra bilde (mest presist)
    // 2. Hvis bildet inneholder et merkenavn som matcher domenet (f.eks. kicks.no + KICKS)
    // 3. Merkenavn fra visjonsanalyse
    // 4. Domene-stammen (f.eks. søk etter kicks.no gir Brreg-søk på "kicks")
    // 5. Manuell tekstforespørsel
    let brregCandidate = '';
    if (visionResult?.detectedOrgNumbers && visionResult.detectedOrgNumbers.length > 0) {
      brregCandidate = visionResult.detectedOrgNumbers[0];
    } else if (
      domainBrandStem &&
      visionResult?.identifiedBrands?.some((b) => b.toLowerCase() === domainBrandStem.toLowerCase())
    ) {
      const matchingBrand = visionResult.identifiedBrands.find(
        (b) => b.toLowerCase() === domainBrandStem.toLowerCase()
      )!;
      brregCandidate = matchingBrand;
    } else if (visionResult?.identifiedBrands && visionResult.identifiedBrands.length > 0) {
      brregCandidate = visionResult.identifiedBrands[0];
    } else if (domainBrandStem) {
      brregCandidate = domainBrandStem;
    } else if (request.query) {
      brregCandidate = request.query.trim();
    }

    const brandForReviews = visionResult?.identifiedBrands?.[0] || domainBrandStem || brregCandidate;

    // 3. Parallell innhenting av eksterne kilder (Brreg, Domene, Omdømme, Google Reviews & Trustpilot)
    const [brregResult, domainResult, reputationResult, reviewsResult] = await Promise.all([
      brregCandidate ? this.brregService.lookup(brregCandidate) : Promise.resolve(undefined),
      domainCandidate ? this.domainService.analyzeDomain(domainCandidate) : Promise.resolve(undefined),
      this.reputationService.checkReputation(effectiveQuery, visionResult?.extractedText),
      this.reviewsService.checkReviews(effectiveQuery, domainCandidate, brandForReviews),
    ]);

    // 4. Helhetlig vurdering og scoring
    const finalReport = await this.geminiService.synthesizeReport({
      id: reportId,
      query: effectiveQuery,
      vision: visionResult,
      brreg: brregResult,
      domain: domainResult,
      reputation: reputationResult,
      reviews: reviewsResult,
    });

    return finalReport;
  }

  private looksLikeUrl(text: string): boolean {
    return /^https?:\/\//i.test(text) || /\.[a-z]{2,}(\/|$)/i.test(text);
  }
}
