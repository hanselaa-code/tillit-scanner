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
    // 2. Domenet fra bildet (hvis nettadresse er oppdaget): Domenet er nettsidens definitive identitet!
    //    Hvis getinspired.no eller sinful.no er i adressefeltet, er det butikken/forhandleren bak domenet som analyseres,
    //    IKKE tilfeldige produkter eller merkevarer på siden (som "Hims", "Nike", "Spar stort").
    // 3. Merkenavn fra visjonsanalyse (for fysiske produkter, emballasje, logoer, annonser uten URL)
    // 4. Manuell tekstforespørsel
    let brregCandidate = '';
    let brandForReviews = '';
    let detectedProduct: string | undefined;

    if (visionResult?.detectedOrgNumbers && visionResult.detectedOrgNumbers.length > 0) {
      brregCandidate = visionResult.detectedOrgNumbers[0];
      brandForReviews = brregCandidate;
    } else if (domainBrandStem) {
      // Domenet er nettsidens kjerneidentitet. Finn beste navneform basert på domenet:
      // Sjekk om teksten i bildet har en formatert versjon (CamelCase eller ord) av domenet,
      // f.eks. "GetInspired" i teksten for domenet "getinspired.no" -> "Get Inspired"
      const textWithoutUrls = (visionResult?.extractedText || '').replace(
        /(?:https?:\/\/)?(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(?:\/[^\s]*)?/gi,
        ' '
      );
      const tokens = textWithoutUrls.match(/[a-zA-ZæøåÆØÅ0-9]+/g) || [];
      const exactToken = tokens.find(
        (t) => t.toLowerCase() === domainBrandStem.toLowerCase()
      );

      if (exactToken) {
        // Splitt CamelCase / PascalCase: "GetInspired" -> "Get Inspired"
        const splitCamel = exactToken.replace(/([a-zæøå0-9])([A-ZÆØÅ])/g, '$1 $2').trim();
        brregCandidate = splitCamel;
      } else {
        // Sjekk om noen av identifiedBrands matcher domenet (f.eks. "Kicks" for "kicks.no", "Sinful" for "sinful.no")
        const matchingBrand = visionResult?.identifiedBrands?.find(
          (b) => b.toLowerCase().replace(/[^a-z0-9]/g, '') === domainBrandStem.toLowerCase()
        );
        brregCandidate = matchingBrand || domainBrandStem.charAt(0).toUpperCase() + domainBrandStem.slice(1);
      }
      brandForReviews = brregCandidate;

      // Hvis det finnes et annet merkevarenavn i bildet enn butikkens eget merkenavn,
      // er det et produkt som vises for salg på siden (f.eks. Hims på sinful.no)
      if (visionResult?.identifiedBrands && visionResult.identifiedBrands.length > 0) {
        const otherBrand = visionResult.identifiedBrands.find(
          (b) => b.toLowerCase().replace(/[^a-z0-9]/g, '') !== domainBrandStem.toLowerCase()
        );
        if (otherBrand) {
          detectedProduct = otherBrand;
        }
      }

      // Sørg for at effectiveQuery reflekterer forhandleren dersom brukeren ikke tastet inn en query manuelt
      if (!request.query) {
        effectiveQuery = brregCandidate;
      }
    } else if (visionResult?.identifiedBrands && visionResult.identifiedBrands.length > 0) {
      brregCandidate = visionResult.identifiedBrands[0];
      brandForReviews = brregCandidate;
    } else if (request.query) {
      brregCandidate = request.query.trim();
      brandForReviews = brregCandidate;
    }

    // 3. Parallell innhenting av eksterne kilder (Brreg, Domene, Omdømme, Google Reviews & Trustpilot)
    const [brregResult, domainResult, reputationResult, reviewsResult] = await Promise.all([
      brregCandidate ? this.brregService.lookup(brregCandidate, domainCandidate) : Promise.resolve(undefined),
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
      detectedProduct,
    });

    return finalReport;
  }

  private looksLikeUrl(text: string): boolean {
    return /^https?:\/\//i.test(text) || /\.[a-z]{2,}(\/|$)/i.test(text);
  }
}
