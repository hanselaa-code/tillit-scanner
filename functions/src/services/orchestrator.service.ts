import { randomUUID } from 'crypto';
import { AnalyzeRequest, FinalAnalysisReport, VisionAnalysisResult } from '../types/analysis.types';
import { GeminiService } from './gemini.service';
import { BrregService } from './brreg.service';
import { DomainService } from './domain.service';
import { ReputationService } from './reputation.service';

export class OrchestratorService {
  private geminiService: GeminiService;
  private brregService: BrregService;
  private domainService: DomainService;
  private reputationService: ReputationService;

  constructor() {
    this.geminiService = new GeminiService();
    this.brregService = new BrregService();
    this.domainService = new DomainService();
    this.reputationService = new ReputationService();
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
        } else if (visionResult.extractedText) {
          effectiveQuery = visionResult.extractedText.slice(0, 50);
        }
      }
    }

    // 2. Utled URL eller Brreg-søkeord
    const domainCandidate = 
      (visionResult?.detectedUrls && visionResult.detectedUrls[0]) ||
      (this.looksLikeUrl(effectiveQuery) ? effectiveQuery : undefined);

    const brregCandidate =
      (visionResult?.detectedOrgNumbers && visionResult.detectedOrgNumbers[0]) ||
      (!this.looksLikeUrl(effectiveQuery) ? effectiveQuery : (visionResult?.identifiedBrands && visionResult.identifiedBrands[0]) || '');

    // 3. Parallell innhenting av eksterne kilder
    const [brregResult, domainResult, reputationResult] = await Promise.all([
      brregCandidate ? this.brregService.lookup(brregCandidate) : Promise.resolve(undefined),
      domainCandidate ? this.domainService.analyzeDomain(domainCandidate) : Promise.resolve(undefined),
      this.reputationService.checkReputation(effectiveQuery, visionResult?.extractedText),
    ]);

    // 4. Helhetlig vurdering og scoring
    const finalReport = await this.geminiService.synthesizeReport({
      id: reportId,
      query: effectiveQuery,
      vision: visionResult,
      brreg: brregResult,
      domain: domainResult,
      reputation: reputationResult,
    });

    return finalReport;
  }

  private looksLikeUrl(text: string): boolean {
    return /^https?:\/\//i.test(text) || /\.[a-z]{2,}(\/|$)/i.test(text);
  }
}
