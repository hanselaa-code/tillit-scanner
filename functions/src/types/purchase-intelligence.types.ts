export type ScanType = 'fast' | 'deep';

export interface CostModuleBreakdown {
  companyCostUsd: number;
  reviewsCostUsd: number;
  productCostUsd: number;
  priceCostUsd: number;
  claimsCostUsd: number;
  drMikeCostUsd: number;
  searchCostUsd: number;
}

export interface EscalationDecision {
  escalated: boolean;
  reason?: string;
  fromModel?: string;
  toModel?: string;
}

export interface CostObservability {
  scanId: string;
  userId?: string;
  scanType: ScanType;
  modelCalls: number;
  modelsUsed: string[];
  inputTokens: number;
  outputTokens: number;
  searchCalls: number;
  externalApiCalls: number;
  ocrCalls: number;
  imageAnalysisCalls: number;
  executionTimeMs: number;
  cacheHits: number;
  cacheMisses: number;
  estimatedCostUsd: number;
  estimatedCostNok: number;
  costByModule: CostModuleBreakdown;
  escalationDecision?: EscalationDecision;
}

export type ProductMatchType =
  | 'CONFIRMED_IDENTICAL'
  | 'HIGH_CONFIDENCE_MATCH'
  | 'LIKELY_OEM_FAMILY'
  | 'VISUALLY_SIMILAR'
  | 'UNVERIFIED';

export interface ProductInfo {
  name: string;
  brand?: string;
  model?: string;
  gtinOrEan?: string;
  sku?: string;
  imageUrl?: string;
  claimedManufacturer?: string;
  possibleOem?: string;
  category?: string;
  price?: number;
  currency?: string;
}

export interface ProductMatch {
  candidateProduct: string;
  sourceUrl?: string;
  similarity: number; // 0-100%
  price?: number;
  currency?: string;
  confidence: 'HIGH' | 'MODERATE' | 'LOW';
  matchType: ProductMatchType;
  notes: string;
}

export type PriceVerdict =
  | 'GOOD_VALUE'
  | 'MIXED'
  | 'POTENTIALLY_POOR_VALUE'
  | 'EXPENSIVE'
  | 'UNABLE_TO_DETERMINE';

export interface PriceIntelligence {
  hasPriceAnalysis: boolean;
  sellerPrice?: { amount: number; currency: string };
  similarProductsPriceRange?: { min: number; max: number; currency: string };
  priceDifferencePercentage?: number;
  priceVerdict: PriceVerdict;
  alternativeCandidates: ProductMatch[];
  importantNotice: string;
}

export interface PurchaseVerdict {
  canITrustThis: 'LAV_RISIKO' | 'MODERAT_RISIKO' | 'HOY_RISIKO';
  isItGoodValue: PriceVerdict;
  reviewsSummary: 'NORMAL' | 'ANOMALIES_DETECTED' | 'INSUFFICIENT_DATA';
  productTransparency: 'ORIGINAL_BRAND' | 'LIKELY_OEM_PRIVATE_LABEL' | 'UNKNOWN';
  claimVerification: 'SUPPORTED' | 'LIMITED_EVIDENCE' | 'NOT_INDEPENDENTLY_VERIFIED' | 'NOT_APPLICABLE';
  drMikeVerdict?: string;
  summaryHeadline: string;
  consumerGuidance: string;
}
