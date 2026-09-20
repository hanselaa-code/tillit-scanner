import { EvidenceObject, EvidenceConfidence } from './evidence.types';

export type TrustRiskLevel = 'LAV_RISIKO' | 'MODERAT_RISIKO' | 'HOY_RISIKO' | 'KRITISK_RISIKO';

export interface ScoreCategoryDetail {
  score: number;      // Oppnådde poeng i denne kategorien
  maxScore: number;   // Maksimalt antall poeng for denne kategorien
  weightPercentage: number;
  evaluated: boolean; // Om det fantes data for å evaluere kategorien
  summary: string;
}

export interface TrustScoreBreakdown {
  businessIdentity: ScoreCategoryDetail;    // Maks 20
  financialFootprint: ScoreCategoryDetail;  // Maks 15
  digitalIdentity: ScoreCategoryDetail;     // Maks 10
  consumerProtection: ScoreCategoryDetail;  // Maks 15
  reviews: ScoreCategoryDetail;             // Maks 15
  productTransparency: ScoreCategoryDetail; // Maks 10
  claimsAndEvidence: ScoreCategoryDetail;   // Maks 10
  externalRiskSignals: ScoreCategoryDetail; // Maks 5
}

export interface AnalysisConfidence {
  level: EvidenceConfidence;
  verifiedCategoriesCount: number;
  totalCategoriesCount: number;
  explanation: string; // F.eks. "7 av 8 datakategorier kunne verifiseres mot uavhengige kilder."
}

export interface HardRedFlag {
  id: string;
  title: string;
  description: string;
  source: string;
  overridesScore: boolean;
}

export interface TimelineEvent {
  yearOrDate: string;
  title: string;
  description: string;
  verified: boolean;
}

export interface FinancialSubstance {
  status: 'VERIFISERT' | 'BEGRENSET' | 'INGEN_DATA' | 'RISIKO';
  summary: string;
  revenueOrTurnover?: string;
  operatingResult?: string;
  equity?: string;
  employeeCount?: number;
  filingYearsCount?: number;
  accountingNotes: string[];
}

export interface ConsumerProtectionAudit {
  status: 'TILFREDSHILLENDE' | 'MANGLER' | 'KRITISK';
  summary: string;
  withdrawalPeriodDays?: number;      // F.eks. 14 dager standard, eller 30/100 dagers utvidet
  hasPhysicalReturnAddress: boolean;
  returnAddress?: string;
  vatAndDutiesIncluded: boolean;      // Tydelig om MVA/toll er inkludert for norske kjøpere
  paymentMethods: string[];           // F.eks. ["Klarna", "Kredittkort", "Vipps", "Krypto"]
  hasCryptoOnlyWarning: boolean;
  termsContradictions: string[];
}

export interface ReviewCluster {
  topic: 'LEVERING' | 'KUNDESERVICE' | 'PRODUKTKVALITET' | 'RETUR_OG_REFUSJON' | 'PRIS_OG_GEBYRER' | 'ANNET';
  sentiment: 'POSITIV' | 'NEGATIV' | 'BLANDET';
  summary: string;
  frequencyPercentage: number;
}

export interface ReviewSimilarityAnomaly {
  detected: boolean;
  similarityScore: number;            // 0-100%
  similarityLevel: 'INGEN' | 'LAV' | 'MODERAT' | 'HOY';
  sampleA?: string;
  sampleB?: string;
  explanation: string;
}

export interface ReviewIntelligenceReport {
  totalReviewCount: number;
  averageRating: number;              // 1.0 - 5.0
  ratingDistribution: {
    fiveStarPct: number;
    fourStarPct: number;
    threeStarPct: number;
    twoStarPct: number;
    oneStarPct: number;
  };
  reviewVelocity: {
    last30DaysCount: number;
    last90DaysCount: number;
    hasUnusualSpike: boolean;
    spikeExplanation?: string;
  };
  similarityAnomaly: ReviewSimilarityAnomaly;
  clusters: {
    praised: ReviewCluster[];
    complained: ReviewCluster[];
  };
  crossPlatformDivergence?: {
    detected: boolean;
    trustpilotScore?: number;
    googleScore?: number;
    explanation?: string;
  };
}

export type ProductOriginMatch =
  | 'CONFIRMED_SAME_PRODUCT'
  | 'LIKELY_OEM_FAMILY'
  | 'VISUALLY_SIMILAR_PRODUCT'
  | 'NO_MATCH_CONFIRMED'
  | 'NOT_APPLICABLE';

export interface ProductSupplyChainReport {
  hasProductAnalysis: boolean;
  detectedProductName?: string;
  originMatch: ProductOriginMatch;
  originExplanation: string;
  manufacturerOrBrandOwner?: string;
  regulatoryClassification: 'WELLNESS_PRODUCT' | 'MEDICAL_DEVICE' | 'CE_MARKED_DEVICE' | 'CONSUMER_GOODS' | 'UKJENT';
  ceMarkingComplianceNotes?: string;
}

export interface MarketingClaimAudit {
  claim: string;
  statedBy: string;
  sellerProofReference?: string;
  status: 'DOKUMENTERT' | 'DELVIS_DOKUMENTERT' | 'IKKE_DOKUMENTERT' | 'MOTBEVIST' | 'IKKE_VERIFISERT';
  evaluation: string;
}

export type DrMikeEvidenceLevel =
  | 'LEVEL_A_SYSTEMATISK_OVERSIKT'  // Cochrane, WHO, EMA, FDA, Helsedirektoratet, DMP, EFSA
  | 'LEVEL_B_RCT_STUDIE'            // Randomiserte kontrollerte studier
  | 'LEVEL_C_OBSERVASJONSSTUDIE'    // Prospektive / kohortstudier
  | 'LEVEL_D_PILOT_OG_IN_VITRO'     // Dyre-/laboratoriestudier, mekanistiske pilotstudier
  | 'LEVEL_E_PRODUSENTENS_DATA';    // Eget markedsføringsmateriale, testimonials (ikke uavhengig)

export type DrMikeEvidenceVerdict =
  | 'STRONG_EVIDENCE'
  | 'MODERATE_EVIDENCE'
  | 'LIMITED_EVIDENCE'
  | 'INSUFFICIENT_EVIDENCE'
  | 'EVIDENCE_CONTRADICTS_CLAIM'
  | 'UNABLE_TO_VERIFY';

export interface DrMikeClaimVerification {
  claim: string;
  verdict: DrMikeEvidenceVerdict;
  verdictLabel: string;
  evidenceLevel: DrMikeEvidenceLevel;
  evidenceQuality: 'HIGH' | 'MODERATE' | 'LOW' | 'VERY_LOW';
  whatTheEvidenceSays: string;
  statisticalVsClinicalSignificance?: string;
  importantLimitation?: string;
  sources: string[];
}

export interface DrMikeMedicalReport {
  hasMedicalClaims: boolean;
  overallDoctorVerdict: string;
  doctorSummary: string; // Doctor's Reality Check i engasjerende, faglig skarp formidlingsstil
  claims: DrMikeClaimVerification[];
  disclaimer: string;
}

export interface TrustReport {
  id: string;
  analyzedAt: string;
  subject: {
    query: string;
    resolvedName: string;
    officialLegalName: string;
    orgNumber?: string;
    country: string;
    websiteUrl?: string;
    registeredAddress?: string;
    establishedYear?: string;
  };
  trustScore: number; // 0 - 100
  riskLevel: TrustRiskLevel;
  confidence: AnalysisConfidence;
  scoreBreakdown: TrustScoreBreakdown;
  executiveSummary: string;
  whatWeFound: string[];   // Nøkkelbevis: Positive og verifiserte fakta
  watchOut: string[];       // Nøkkeladvarsler: Anomalier og risikosignaler
  hardRedFlags: HardRedFlag[];
  timeline: TimelineEvent[];
  financialSubstance: FinancialSubstance;
  consumerProtection: ConsumerProtectionAudit;
  reviewIntelligence: ReviewIntelligenceReport;
  productSupplyChain: ProductSupplyChainReport;
  marketingClaims: MarketingClaimAudit[];
  drMikeMedical: DrMikeMedicalReport;
  evidenceChain: EvidenceObject[]; // Den komplette beviskjeden for "Show investigation" / Deep dive
}
