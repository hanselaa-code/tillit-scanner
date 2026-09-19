export interface AnalyzeRequest {
  image?: string; // base64 string
  mimeType?: string; // e.g. 'image/jpeg' | 'image/png'
  query?: string; // Company name, org nr, or URL
}

export interface VisualRedFlag {
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
}

export interface VisionAnalysisResult {
  extractedText: string;
  identifiedBrands: string[];
  detectedUrls: string[];
  detectedOrgNumbers: string[];
  visualRedFlags: VisualRedFlag[];
  summaryOfContent: string;
  hasSuspiciousVisualDesign: boolean;
}

export interface BrregEntity {
  organisasjonsnummer: string;
  navn: string;
  organisasjonsform?: {
    kode: string;
    beskrivelse: string;
  };
  registreringsdatoEnhetsregisteret?: string;
  stiftelsesdato?: string;
  registrertIMvaregisteret?: boolean;
  konkurs?: boolean;
  underAvvikling?: boolean;
  underTvangsavviklingEllerTvangsopplosning?: boolean;
  naeringskode1?: {
    kode: string;
    beskrivelse: string;
  };
  postadresse?: {
    adresse?: string[];
    postnummer?: string;
    poststed?: string;
    land?: string;
  };
  antallAnsatte?: number;
}

export interface BrandToEntityLink {
  brandName: string;
  officialName: string;
  relationship: string;
  primaryOrgNr: string;
}

export interface BrregCheckResult {
  searchedQuery?: string;
  found: boolean;
  entity?: BrregEntity;
  warningFlags: string[];
  isDissolvedOrBankrupt: boolean;
  isRegisteredInMva: boolean;
  ageYears?: number;
  brandLink?: BrandToEntityLink;
}

export interface DomainCheckResult {
  domain: string;
  isHttps: boolean;
  isSuspiciousTld: boolean;
  isNewlyRegistered?: boolean;
  dnsResolved: boolean;
  flags: string[];
}

export interface ReputationCheckResult {
  isKnownScam: boolean;
  consumerWarningFound: boolean;
  warningSources: string[];
  notes: string[];
}

export type TrafficLightColor = 'GREEN' | 'YELLOW' | 'RED';
export type RiskLevel = 'LAV' | 'MODERAT' | 'HØY';
export type FactorSeverity = 'info' | 'warning' | 'danger';

export interface AssessmentFactor {
  title: string;
  description: string;
  severity: FactorSeverity;
}

export interface GoogleReviewSnippet {
  authorName?: string;
  rating?: number;
  relativePublishTimeDescription?: string;
  text?: string;
}

export interface GoogleReviewInfo {
  found: boolean;
  placeName?: string;
  rating?: number;
  userRatingCount?: number;
  formattedAddress?: string;
  googleMapsUri?: string;
  recentReviews?: GoogleReviewSnippet[];
}

export interface TrustpilotInfo {
  url?: string;
  domain?: string;
}

export interface ReviewsCheckResult {
  google?: GoogleReviewInfo;
  trustpilot?: TrustpilotInfo;
  summary?: string;
  warningFlags?: string[];
  positiveFlags?: string[];
}

export interface FinalAnalysisReport {
  id: string;
  analyzedAt: string;
  score: number; // 0 (svindel / kritisk risiko) til 100 (svært trygt)
  trafficLight: TrafficLightColor;
  riskLevel: RiskLevel;
  headline: string;
  executiveSummary: string;
  riskFactors: AssessmentFactor[];
  positiveFactors: AssessmentFactor[];
  actionableAdvice: string[];
  identifiedSubject: {
    name?: string;
    legalName?: string;
    tradeName?: string;
    relationship?: string;
    orgNumber?: string;
    websiteUrl?: string;
    detectedProduct?: string;
  };
  brreg?: BrregCheckResult;
  domain?: DomainCheckResult;
  vision?: VisionAnalysisResult;
  reputation?: ReputationCheckResult;
  reviews?: ReviewsCheckResult;
}
