import {
  PriceIntelligence,
  ProductMatch,
  PriceVerdict,
  PurchaseVerdict,
} from '../types/purchase-intelligence.types';
import { EvidenceObject } from '../types/evidence.types';

export class PriceIntelligenceService {
  /**
   * Kunnskapsbase for typiske markedsprisintervaller for vanlige OEM-forbrukerprodukter
   */
  private static readonly OEM_BENCHMARKS: Array<{
    keywords: string[];
    categoryName: string;
    genericBenchmarkMinNok: number;
    genericBenchmarkMaxNok: number;
    candidateExamples: string[];
  }> = [
    {
      keywords: ['smartvekt', 'smart vekt', 'kroppsskanner', 'baderomsvekt', 'bioimpedans', 'kroppsvekt'],
      categoryName: 'Smartvekt med bioelektrisk impedans (BIA)',
      genericBenchmarkMinNok: 399,
      genericBenchmarkMaxNok: 799,
      candidateExamples: ['Xiaomi Mi Body Composition Scale', 'Huawei Smart Scale', 'Withings Body'],
    },
    {
      keywords: ['massasjepistol', 'muskelmassasje'],
      categoryName: 'Massasjepistol for muskelbehandling',
      genericBenchmarkMinNok: 399,
      genericBenchmarkMaxNok: 899,
      candidateExamples: ['Hyperice Hypervolt (Premium)', 'Standard OEM 24V massasjepistol'],
    },
    {
      keywords: ['ipl', 'laser hårfjerner', 'hårfjerner'],
      categoryName: 'IPL laser-hårfjerner for hjemmebruk',
      genericBenchmarkMinNok: 499,
      genericBenchmarkMaxNok: 1099,
      candidateExamples: ['Philips Lumea (Original merke)', 'OEM IPL hårlaser'],
    },
    {
      keywords: ['holdningsvest', 'ryggstøtte'],
      categoryName: 'Holdningsvest og ryggkorrigering',
      genericBenchmarkMinNok: 149,
      genericBenchmarkMaxNok: 349,
      candidateExamples: ['Standard neopren holdningssele'],
    },
    {
      keywords: ['tannbleking', 'led tannbleking'],
      categoryName: 'LED tannblekingssett for hjemmebruk',
      genericBenchmarkMinNok: 199,
      genericBenchmarkMaxNok: 499,
      candidateExamples: ['Trådløst LED-skinnesett'],
    },
  ];

  /**
   * Analyserer selgers pris mot markedet og genererer pris- og kjøpsintelligens
   */
  public analyzePriceAndAlternatives(
    fullContextText: string,
    detectedProductName?: string,
    isOemCategory: boolean = false
  ): { priceIntelligence: PriceIntelligence; evidence: EvidenceObject[] } {
    const evidence: EvidenceObject[] = [];
    const now = new Date().toISOString();
    const text = `${detectedProductName || ''} ${fullContextText}`.toLowerCase();

    // 1. Let etter priser i teksten (f.eks. "1 499 kr", "2499,-", "990 NOK")
    const detectedPrice = this.extractPriceFromText(text);

    // 2. Finn eventuell OEM-benchmark for kategorien
    const matchedBenchmark = PriceIntelligenceService.OEM_BENCHMARKS.find((b) =>
      b.keywords.some((k) => text.includes(k))
    );

    if (!matchedBenchmark && !detectedPrice) {
      return {
        priceIntelligence: {
          hasPriceAnalysis: false,
          priceVerdict: 'UNABLE_TO_DETERMINE',
          alternativeCandidates: [],
          importantNotice: 'Ingen konkret pris eller standard OEM-kategori ble identifisert for prissammenligning.',
        },
        evidence: [],
      };
    }

    const sellerPriceAmount = detectedPrice || (isOemCategory ? 1999 : undefined);
    const minBenchmark = matchedBenchmark?.genericBenchmarkMinNok || 400;
    const maxBenchmark = matchedBenchmark?.genericBenchmarkMaxNok || 900;

    // 3. Vurder prisnivå
    let priceVerdict: PriceVerdict = 'UNABLE_TO_DETERMINE';
    let priceDiffPct: number | undefined;

    if (sellerPriceAmount) {
      if (sellerPriceAmount > maxBenchmark * 1.8) {
        priceVerdict = 'POTENTIALLY_POOR_VALUE';
        priceDiffPct = Math.round(((sellerPriceAmount - maxBenchmark) / maxBenchmark) * 100);
      } else if (sellerPriceAmount > maxBenchmark * 1.2) {
        priceVerdict = 'EXPENSIVE';
        priceDiffPct = Math.round(((sellerPriceAmount - maxBenchmark) / maxBenchmark) * 100);
      } else if (sellerPriceAmount < minBenchmark * 0.8) {
        priceVerdict = 'GOOD_VALUE';
      } else {
        priceVerdict = 'MIXED';
      }
    }

    // 4. Bygg alternative kandidater
    const alternativeCandidates: ProductMatch[] = [];
    if (matchedBenchmark) {
      for (const cand of matchedBenchmark.candidateExamples) {
        alternativeCandidates.push({
          candidateProduct: cand,
          similarity: 85,
          price: minBenchmark,
          currency: 'NOK',
          confidence: 'MODERATE',
          matchType: 'LIKELY_OEM_FAMILY',
          notes: `Tilhører tilsvarende produkt- og sensorkategori (${matchedBenchmark.categoryName}).`,
        });
      }
    }

    const notice =
      'Vi kan ikke bekrefte at dette er nøyaktig samme produksjonsbatch eller at garanti- og kundeservicebetingelser er 1:1 identiske. Sammenligningen gjelder kjente OEM-hardware-plattformer med likeverdige spesifikasjoner.';

    if (sellerPriceAmount && (priceVerdict === 'POTENTIALLY_POOR_VALUE' || priceVerdict === 'EXPENSIVE')) {
      evidence.push({
        id: `ev-price-intel-${Math.random().toString(36).substring(7)}`,
        category: 'PRODUCT',
        claim: 'Prisnivå sammenlignet med tilsvarende maskinvare i markedet',
        finding: `Selgers pris (${sellerPriceAmount} NOK) er vesentlig høyere enn sammenlignbare modeller i samme OEM-kategori (${minBenchmark}–${maxBenchmark} NOK).`,
        verdict: 'INFERENS',
        sourceName: 'Price & Hardware Intelligence',
        sourceType: 'NETTSIDE',
        retrievedAt: now,
        confidence: 'MODERATE',
        supportingSnippet: `Estimert merpris mot markedsreferanse er ca. +${priceDiffPct || 0}%.`,
      });
    }

    return {
      priceIntelligence: {
        hasPriceAnalysis: true,
        sellerPrice: sellerPriceAmount ? { amount: sellerPriceAmount, currency: 'NOK' } : undefined,
        similarProductsPriceRange: {
          min: minBenchmark,
          max: maxBenchmark,
          currency: 'NOK',
        },
        priceDifferencePercentage: priceDiffPct,
        priceVerdict,
        alternativeCandidates,
        importantNotice: notice,
      },
      evidence,
    };
  }

  /**
   * Syntetiserer en helhetlig "AI Purchase Verdict" til toppseksjonen i appen
   */
  public synthesizePurchaseVerdict(params: {
    trustScore: number;
    riskLevel: 'LAV_RISIKO' | 'MODERAT_RISIKO' | 'HOY_RISIKO' | 'KRITISK_RISIKO';
    priceVerdict: PriceVerdict;
    hasReviewAnomaly: boolean;
    totalReviews: number;
    isOemProduct: boolean;
    hasContradictedMedicalClaims: boolean;
    hasUnverifiedMedicalClaims: boolean;
    drMikeSummary?: string;
  }): PurchaseVerdict {
    const {
      trustScore,
      riskLevel,
      priceVerdict,
      hasReviewAnomaly,
      totalReviews,
      isOemProduct,
      hasContradictedMedicalClaims,
      hasUnverifiedMedicalClaims,
      drMikeSummary,
    } = params;

    let canITrustThis: 'LAV_RISIKO' | 'MODERAT_RISIKO' | 'HOY_RISIKO' = 'MODERAT_RISIKO';
    if (riskLevel === 'LAV_RISIKO' && trustScore >= 70) {
      canITrustThis = 'LAV_RISIKO';
    } else if (riskLevel === 'HOY_RISIKO' || riskLevel === 'KRITISK_RISIKO' || trustScore < 45) {
      canITrustThis = 'HOY_RISIKO';
    }

    let reviewsSummary: 'NORMAL' | 'ANOMALIES_DETECTED' | 'INSUFFICIENT_DATA' = 'NORMAL';
    if (hasReviewAnomaly) {
      reviewsSummary = 'ANOMALIES_DETECTED';
    } else if (totalReviews === 0) {
      reviewsSummary = 'INSUFFICIENT_DATA';
    }

    const productTransparency: 'ORIGINAL_BRAND' | 'LIKELY_OEM_PRIVATE_LABEL' | 'UNKNOWN' =
      isOemProduct ? 'LIKELY_OEM_PRIVATE_LABEL' : 'ORIGINAL_BRAND';

    let claimVerification: 'SUPPORTED' | 'LIMITED_EVIDENCE' | 'NOT_INDEPENDENTLY_VERIFIED' | 'NOT_APPLICABLE' =
      'NOT_APPLICABLE';
    if (hasContradictedMedicalClaims) {
      claimVerification = 'NOT_INDEPENDENTLY_VERIFIED';
    } else if (hasUnverifiedMedicalClaims) {
      claimVerification = 'LIMITED_EVIDENCE';
    }

    let summaryHeadline = '';
    let consumerGuidance = '';

    if (canITrustThis === 'HOY_RISIKO') {
      summaryHeadline = 'Høy kommersiell eller regulatorisk risiko';
      consumerGuidance = 'Flere kritiske faresignaler eller motstridende opplysninger. Unngå forskuddsbetaling.';
    } else if (priceVerdict === 'POTENTIALLY_POOR_VALUE') {
      summaryHeadline = 'Etablert selger, men potensielt lav verdi for pengene';
      consumerGuidance = 'Varen fremstår som en OEM/private-label-modell med markant prispåslag. Sjekk alternative modeller før kjøp.';
    } else if (canITrustThis === 'LAV_RISIKO') {
      summaryHeadline = 'Trygg og transparent aktør';
      consumerGuidance = 'Virksomheten er verifisert i offentlige registre med ryddige forbrukervilkår.';
    } else {
      summaryHeadline = 'Blandet tillitsprofil – undersøk vilkårene';
      consumerGuidance = 'Bruk kredittkort eller Klarna for å sikre dine lovfestede reklamasjonsrettigheter.';
    }

    return {
      canITrustThis,
      isItGoodValue: priceVerdict,
      reviewsSummary,
      productTransparency,
      claimVerification,
      drMikeVerdict: drMikeSummary,
      summaryHeadline,
      consumerGuidance,
    };
  }

  private extractPriceFromText(text: string): number | undefined {
    // F.eks. "1 499 kr", "2499,-", "990 nok", "pris: 1290"
    const match = text.match(/(?:pris|kun|kost(?:er|nad)|tilbud)?\s*[:]?\s*(\d{1,3}(?:[ \.,]\d{3})*|\d{2,5})\s*(?:kr|nok|,-\b)/i);
    if (match && match[1]) {
      const cleanNum = match[1].replace(/[\s\.,]/g, '');
      const parsed = parseInt(cleanNum, 10);
      if (!isNaN(parsed) && parsed > 50 && parsed < 200000) {
        return parsed;
      }
    }
    return undefined;
  }
}
