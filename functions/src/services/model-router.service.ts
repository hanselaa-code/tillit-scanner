import {
  CostObservability,
  CostModuleBreakdown,
  EscalationDecision,
  ScanType,
} from '../types/purchase-intelligence.types';

export type ModelTier = 'CHEAP' | 'DEFAULT' | 'ESCALATION';

export interface ModelRoutingRequest {
  workload:
    | 'CLASSIFICATION'
    | 'URL_EXTRACTION'
    | 'STRUCTURED_PARSING'
    | 'COMPANY_ANALYSIS'
    | 'REVIEW_CLUSTERING'
    | 'CLAIM_EXTRACTION'
    | 'DR_MIKE_STANDARD'
    | 'COMPLEX_CONFLICTING_EVIDENCE'
    | 'MEDICAL_CONTRADICTION_AUDIT';
  prompt: string;
  module: keyof CostModuleBreakdown;
  forceEscalation?: boolean;
  escalationReason?: string;
  fallbackText?: string;
}

export interface ModelPricing {
  inputPerMillionUsd: number;
  outputPerMillionUsd: number;
}

const PRICING_MAP: Record<string, ModelPricing> = {
  'gemini-2.5-flash-lite': { inputPerMillionUsd: 0.075, outputPerMillionUsd: 0.30 },
  'gemini-2.5-flash': { inputPerMillionUsd: 0.15, outputPerMillionUsd: 0.60 },
  'gemini-1.5-pro': { inputPerMillionUsd: 1.25, outputPerMillionUsd: 5.00 },
};

const USD_TO_NOK_RATE = 10.85;

export class ModelRouterService {
  private scanId: string;
  private userId?: string;
  private scanType: ScanType;
  private startTime: number;

  private modelCalls: number = 0;
  private modelsUsed: Set<string> = new Set();
  private inputTokens: number = 0;
  private outputTokens: number = 0;

  private searchCalls: number = 0;
  private externalApiCalls: number = 0;
  private ocrCalls: number = 0;
  private imageAnalysisCalls: number = 0;

  private cacheHits: number = 0;
  private cacheMisses: number = 0;

  private costByModule: CostModuleBreakdown = {
    companyCostUsd: 0,
    reviewsCostUsd: 0,
    productCostUsd: 0,
    priceCostUsd: 0,
    claimsCostUsd: 0,
    drMikeCostUsd: 0,
    searchCostUsd: 0,
  };

  private escalationDecision?: EscalationDecision;

  constructor(scanId: string, scanType: ScanType = 'fast', userId?: string) {
    this.scanId = scanId;
    this.scanType = scanType;
    this.userId = userId;
    this.startTime = Date.now();
  }

  /**
   * Avgjør hvilken modell som skal benyttes basert på arbeidslast og eskalering
   */
  public selectModel(req: ModelRoutingRequest): { modelName: string; tier: ModelTier } {
    if (req.forceEscalation) {
      this.escalationDecision = {
        escalated: true,
        reason: req.escalationReason || 'Eksplisitt forespurt eskalering til Pro-modell',
        fromModel: 'gemini-2.5-flash',
        toModel: 'gemini-1.5-pro',
      };
      return { modelName: 'gemini-1.5-pro', tier: 'ESCALATION' };
    }

    switch (req.workload) {
      case 'CLASSIFICATION':
      case 'URL_EXTRACTION':
      case 'STRUCTURED_PARSING':
        return { modelName: 'gemini-2.5-flash-lite', tier: 'CHEAP' };

      case 'COMPLEX_CONFLICTING_EVIDENCE':
      case 'MEDICAL_CONTRADICTION_AUDIT':
        this.escalationDecision = {
          escalated: true,
          reason: req.escalationReason || `Høy kompleksitet / motstridende kilder i ${req.workload}`,
          fromModel: 'gemini-2.5-flash',
          toModel: 'gemini-1.5-pro',
        };
        return { modelName: 'gemini-1.5-pro', tier: 'ESCALATION' };

      case 'COMPANY_ANALYSIS':
      case 'REVIEW_CLUSTERING':
      case 'CLAIM_EXTRACTION':
      case 'DR_MIKE_STANDARD':
      default:
        return { modelName: 'gemini-2.5-flash', tier: 'DEFAULT' };
    }
  }

  /**
   * Registrerer token- og kostnadsbruk for et modellkall
   */
  public recordModelUsage(
    modelName: string,
    inTokens: number,
    outTokens: number,
    moduleKey: keyof CostModuleBreakdown
  ): void {
    this.modelCalls++;
    this.modelsUsed.add(modelName);
    this.inputTokens += inTokens;
    this.outputTokens += outTokens;

    const pricing = PRICING_MAP[modelName] || PRICING_MAP['gemini-2.5-flash'];
    const callCostUsd =
      (inTokens / 1_000_000) * pricing.inputPerMillionUsd +
      (outTokens / 1_000_000) * pricing.outputPerMillionUsd;

    this.costByModule[moduleKey] = (this.costByModule[moduleKey] || 0) + callCostUsd;
  }

  /**
   * Registrerer eksterne API- og søkekall
   */
  public recordExternalApiCall(serviceName: string, moduleKey: keyof CostModuleBreakdown = 'searchCostUsd'): void {
    this.externalApiCalls++;
    // Estimat: ~$0.0004 per eksternt oppslag (f.eks. Google Places, Whois)
    const apiCost = 0.0004;
    this.costByModule[moduleKey] = (this.costByModule[moduleKey] || 0) + apiCost;
  }

  public recordSearchCall(): void {
    this.searchCalls++;
    this.costByModule.searchCostUsd += 0.001;
  }

  public recordImageAnalysis(isOcr: boolean = false): void {
    if (isOcr) {
      this.ocrCalls++;
    } else {
      this.imageAnalysisCalls++;
    }
    // Visjonsbildekostnad: ~$0.0008
    this.costByModule.companyCostUsd += 0.0008;
  }

  public recordCacheHit(): void {
    this.cacheHits++;
  }

  public recordCacheMiss(): void {
    this.cacheMisses++;
  }

  /**
   * Genererer den endelige CostObservability-rapporten for denne skanningen
   */
  public getObservabilityReport(): CostObservability {
    const totalCostUsd = Object.values(this.costByModule).reduce((sum, val) => sum + val, 0);
    const totalCostNok = totalCostUsd * USD_TO_NOK_RATE;
    const executionTimeMs = Date.now() - this.startTime;

    return {
      scanId: this.scanId,
      userId: this.userId,
      scanType: this.scanType,
      modelCalls: this.modelCalls,
      modelsUsed: Array.from(this.modelsUsed),
      inputTokens: this.inputTokens,
      outputTokens: this.outputTokens,
      searchCalls: this.searchCalls,
      externalApiCalls: this.externalApiCalls,
      ocrCalls: this.ocrCalls,
      imageAnalysisCalls: this.imageAnalysisCalls,
      executionTimeMs,
      cacheHits: this.cacheHits,
      cacheMisses: this.cacheMisses,
      estimatedCostUsd: Number(totalCostUsd.toFixed(6)),
      estimatedCostNok: Number(totalCostNok.toFixed(4)),
      costByModule: {
        companyCostUsd: Number(this.costByModule.companyCostUsd.toFixed(6)),
        reviewsCostUsd: Number(this.costByModule.reviewsCostUsd.toFixed(6)),
        productCostUsd: Number(this.costByModule.productCostUsd.toFixed(6)),
        priceCostUsd: Number(this.costByModule.priceCostUsd.toFixed(6)),
        claimsCostUsd: Number(this.costByModule.claimsCostUsd.toFixed(6)),
        drMikeCostUsd: Number(this.costByModule.drMikeCostUsd.toFixed(6)),
        searchCostUsd: Number(this.costByModule.searchCostUsd.toFixed(6)),
      },
      escalationDecision: this.escalationDecision,
    };
  }
}
