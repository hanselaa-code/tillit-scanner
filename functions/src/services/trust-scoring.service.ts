import {
  TrustScoreBreakdown,
  AnalysisConfidence,
  HardRedFlag,
  TrustRiskLevel,
} from '../types/trust-report.types';
import { EvidenceObject } from '../types/evidence.types';

export interface ScoringInputs {
  isRegisteredCompany: boolean;
  isBankruptOrLiquidating: boolean;
  financialStatus: 'VERIFISERT' | 'BEGRENSET' | 'INGEN_DATA' | 'RISIKO';
  hasActiveDnsAndHttps: boolean;
  suspiciousDomainFlagsCount: number;
  consumerProtectionStatus: 'TILFREDSHILLENDE' | 'MANGLER' | 'KRITISK';
  reviewAverage: number; // 0.0 - 5.0
  reviewCount: number;
  hasReviewSimilarityAnomaly: boolean;
  hasProductAnalysis: boolean;
  isOemCategory: boolean;
  medicalClaimsContradicted: boolean;
  medicalClaimsUnverified: boolean;
  externalScamWarningFound: boolean;
  evidenceChain: EvidenceObject[];
}

export class TrustScoringService {
  /**
   * Beregner transparent Trust Score basert på 8 uavhengige delkategorier (0-100 totalt)
   * og kalkulerer analyse-confidence.
   */
  public calculateScore(inputs: ScoringInputs): {
    trustScore: number;
    riskLevel: TrustRiskLevel;
    breakdown: TrustScoreBreakdown;
    confidence: AnalysisConfidence;
    hardRedFlags: HardRedFlag[];
  } {
    let verifiedCount = 0;
    const totalCategories = 8;
    const hardRedFlags: HardRedFlag[] = [];

    // 1. Business Identity (Maks 20)
    let businessScore = 10; // Nøytralt utgangspunkt
    let businessEvaluated = false;
    let businessSummary = '';

    if (inputs.isRegisteredCompany) {
      businessScore = 20;
      businessEvaluated = true;
      verifiedCount++;
      businessSummary = 'Offisielt registrert i offentlig virksomhetsregister med gyldig selskapsform.';
    } else {
      businessScore = 8;
      businessSummary = 'Ingen bekreftet registrering i det nasjonale foretaksregisteret (Brønnøysund).';
    }

    if (inputs.isBankruptOrLiquidating) {
      businessScore = 0;
      hardRedFlags.push({
        id: 'hrf-bankruptcy',
        title: 'Konkurs eller tvangsavvikling',
        description: 'Foretaket er meldt konkurs eller under avvikling i offisielle selskapsregistre.',
        source: 'Brønnøysundregistrene',
        overridesScore: true,
      });
    }

    // 2. Financial Footprint (Maks 15)
    let financialScore = 8; // Nøytral hvis ingen data
    let financialEvaluated = false;
    let financialSummary = '';

    if (inputs.financialStatus === 'VERIFISERT') {
      financialScore = 15;
      financialEvaluated = true;
      verifiedCount++;
      financialSummary = 'Dokumentert flerårig økonomisk aktivitet og positiv egenkapital i offisielle regnskaper.';
    } else if (inputs.financialStatus === 'RISIKO') {
      financialScore = 3;
      financialEvaluated = true;
      verifiedCount++;
      financialSummary = 'Rapportert negativ egenkapital eller økonomisk sårbarhet i siste årsregnskap.';
    } else if (inputs.financialStatus === 'BEGRENSET') {
      financialScore = 8;
      financialSummary = 'Nystiftet selskap, enkeltpersonforetak eller foretak uten pliktig regnskapslevering.';
    } else {
      financialScore = 7;
      financialSummary = 'Ingen regnskapstall tilgjengelig for uavhengig verifisering.';
    }

    // 3. Digital Identity (Maks 10)
    let digitalScore = 10;
    let digitalEvaluated = true;
    verifiedCount++;
    let digitalSummary = 'Domenet har gyldig DNS og sikker HTTPS-kryptering.';

    if (!inputs.hasActiveDnsAndHttps) {
      digitalScore -= 5;
      digitalSummary = 'Mangelfull eller usikker digital infrastruktur.';
    }
    if (inputs.suspiciousDomainFlagsCount > 0) {
      digitalScore = Math.max(0, digitalScore - inputs.suspiciousDomainFlagsCount * 3);
      digitalSummary = 'Observasjon av risikosignaler i domenenavnet (mistenkelig TLD eller etterligning).';
    }

    // 4. Consumer Protection (Maks 15)
    let consumerScore = 10;
    let consumerEvaluated = false;
    let consumerSummary = '';

    if (inputs.consumerProtectionStatus === 'TILFREDSHILLENDE') {
      consumerScore = 15;
      consumerEvaluated = true;
      verifiedCount++;
      consumerSummary = 'Lovfestet angrerett, sikre betalingskanaler og transparente kjøpsbetingelser identifisert.';
    } else if (inputs.consumerProtectionStatus === 'MANGLER') {
      consumerScore = 8;
      consumerEvaluated = true;
      verifiedCount++;
      consumerSummary = 'Enkelte mangler eller uklarheter i returadresse, toll eller forbrukervilkår.';
    } else {
      consumerScore = 2;
      consumerEvaluated = true;
      verifiedCount++;
      consumerSummary = 'Kritiske mangler: Fraskrivelse av angrerett eller urimelig returprosess.';
    }

    // 5. Reviews (Maks 15)
    let reviewScore = 10;
    let reviewEvaluated = false;
    let reviewSummary = '';

    if (inputs.reviewCount >= 5) {
      reviewEvaluated = true;
      verifiedCount++;
      if (inputs.reviewAverage >= 4.2) {
        reviewScore = 15;
        reviewSummary = `Svært gode kundeanmeldelser (${inputs.reviewAverage} / 5).`;
      } else if (inputs.reviewAverage >= 3.5) {
        reviewScore = 11;
        reviewSummary = `Gjennomsnittlige kundeomtaler (${inputs.reviewAverage} / 5).`;
      } else if (inputs.reviewAverage >= 2.5) {
        reviewScore = 6;
        reviewSummary = `Under middels kundetilfredshet (${inputs.reviewAverage} / 5).`;
      } else {
        reviewScore = 2;
        reviewSummary = `Kritisk lave kundevurderinger (${inputs.reviewAverage} / 5) med hyppige klager.`;
      }

      if (inputs.hasReviewSimilarityAnomaly) {
        reviewScore = Math.max(3, reviewScore - 4);
        reviewSummary += ' Obs: Uvanlig språklig likhet avdekket i flere anmeldelser.';
      }
    } else {
      reviewScore = 8;
      reviewSummary = 'Få eller ingen uavhengige anmeldelser registrert ennå.';
    }

    // 6. Product Transparency (Maks 10)
    let productScore = 10;
    let productEvaluated = false;
    let productSummary = '';

    if (inputs.hasProductAnalysis) {
      productEvaluated = true;
      verifiedCount++;
      if (inputs.isOemCategory) {
        productScore = 7;
        productSummary = 'Produktet tilhører en kjent OEM/private-label-kategori med generiske produksjonsmodeller.';
      } else {
        productScore = 10;
        productSummary = 'Etablert merkevare eller transparent forhandlernettverk.';
      }
    } else {
      productScore = 9;
      productSummary = 'Generell forhandler- eller tjenestevurdering.';
    }

    // 7. Claims & Evidence (Maks 10)
    let claimsScore = 10;
    let claimsEvaluated = false;
    let claimsSummary = 'Nøkterne eller rimelige påstander.';

    if (inputs.medicalClaimsContradicted) {
      claimsScore = 2;
      claimsEvaluated = true;
      verifiedCount++;
      claimsSummary = 'Fremsetter fysiologisk uholdbare eller motbeviste helsepåstander.';
    } else if (inputs.medicalClaimsUnverified) {
      claimsScore = 6;
      claimsEvaluated = true;
      verifiedCount++;
      claimsSummary = 'Markedsføringen lover høyere presisjon eller effekt enn uavhengige studier støtter.';
    } else {
      claimsScore = 10;
      claimsSummary = 'Ingen villedende eller udokumenterte mirakelord observert.';
    }

    // 8. External Risk Signals (Maks 5)
    let externalScore = 5;
    let externalEvaluated = true;
    verifiedCount++;
    let externalSummary = 'Ingen treff i offisielle varslingslister eller tilsynsadvarsler.';

    if (inputs.externalScamWarningFound) {
      externalScore = 0;
      externalSummary = 'Registrert advarsel hos Forbrukertilsynet, Finanstilsynet eller Varslingslisten.';
      hardRedFlags.push({
        id: 'hrf-consumer-warning',
        title: 'Offisiell forbrukeradvarsel',
        description: 'Virksomheten eller dens markedsføringsmetoder er eksplisitt omtalt i offentlige varslingslister.',
        source: 'Forbrukertilsynet / Varslingslisten',
        overridesScore: true,
      });
    }

    // Beregn sum
    let totalScore =
      businessScore +
      financialScore +
      digitalScore +
      consumerScore +
      reviewScore +
      productScore +
      claimsScore +
      externalScore;

    // Hard red flags overstyrer
    if (hardRedFlags.length > 0) {
      totalScore = Math.min(28, totalScore);
    }

    totalScore = Math.max(0, Math.min(100, Math.round(totalScore)));

    // Risikonivå
    let riskLevel: TrustRiskLevel = 'LAV_RISIKO';
    if (totalScore < 40 || hardRedFlags.length > 0) {
      riskLevel = totalScore < 25 ? 'KRITISK_RISIKO' : 'HOY_RISIKO';
    } else if (totalScore < 70) {
      riskLevel = 'MODERAT_RISIKO';
    }

    // Confidence Level
    let confidenceLevel: AnalysisConfidence['level'] = 'LOW';
    if (verifiedCount >= 6) {
      confidenceLevel = 'HIGH';
    } else if (verifiedCount >= 4) {
      confidenceLevel = 'MODERATE';
    }

    const confidenceExplanation =
      confidenceLevel === 'HIGH'
        ? `${verifiedCount} av ${totalCategories} datakategorier er grundig verifisert mot uavhengige primærkilder.`
        : confidenceLevel === 'MODERATE'
        ? `${verifiedCount} av ${totalCategories} datakategorier kunne verifiseres. Enkelte områder baserer seg på fravær av negative funn.`
        : `Kun ${verifiedCount} av ${totalCategories} datakategorier kunne verifiseres. Utvis ekstra aktsomhet da informasjonsgrunnlaget er begrenset.`;

    const breakdown: TrustScoreBreakdown = {
      businessIdentity: {
        score: businessScore,
        maxScore: 20,
        weightPercentage: 20,
        evaluated: businessEvaluated,
        summary: businessSummary,
      },
      financialFootprint: {
        score: financialScore,
        maxScore: 15,
        weightPercentage: 15,
        evaluated: financialEvaluated,
        summary: financialSummary,
      },
      digitalIdentity: {
        score: digitalScore,
        maxScore: 10,
        weightPercentage: 10,
        evaluated: digitalEvaluated,
        summary: digitalSummary,
      },
      consumerProtection: {
        score: consumerScore,
        maxScore: 15,
        weightPercentage: 15,
        evaluated: consumerEvaluated,
        summary: consumerSummary,
      },
      reviews: {
        score: reviewScore,
        maxScore: 15,
        weightPercentage: 15,
        evaluated: reviewEvaluated,
        summary: reviewSummary,
      },
      productTransparency: {
        score: productScore,
        maxScore: 10,
        weightPercentage: 10,
        evaluated: productEvaluated,
        summary: productSummary,
      },
      claimsAndEvidence: {
        score: claimsScore,
        maxScore: 10,
        weightPercentage: 10,
        evaluated: claimsEvaluated,
        summary: claimsSummary,
      },
      externalRiskSignals: {
        score: externalScore,
        maxScore: 5,
        weightPercentage: 5,
        evaluated: externalEvaluated,
        summary: externalSummary,
      },
    };

    return {
      trustScore: totalScore,
      riskLevel,
      breakdown,
      confidence: {
        level: confidenceLevel,
        verifiedCategoriesCount: verifiedCount,
        totalCategoriesCount: totalCategories,
        explanation: confidenceExplanation,
      },
      hardRedFlags,
    };
  }
}
