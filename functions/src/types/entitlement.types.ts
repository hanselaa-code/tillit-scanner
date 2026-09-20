export type UserTier = 'FREE' | 'PRO' | 'BUSINESS';

export interface FeatureFlags {
  drMikeEnabled: boolean;
  productIntelligenceEnabled: boolean;
  priceComparisonEnabled: boolean;
  deepScanEnabled: boolean;
  subscriptionsEnabled: boolean;
  businessMonitoringEnabled: boolean;
}

export interface EntitlementLimits {
  tier: UserTier;
  monthlyFastScans: number;
  monthlyDeepScans: number;
  canUseDrMike: boolean;
  canViewPriceAlternatives: boolean;
  canExportReports: boolean;
  canMonitorCompanies: boolean;
}

export interface UserUsageState {
  userId: string;
  tier: UserTier;
  currentMonthKey: string; // YYYY-MM
  fastScansUsed: number;
  deepScansUsed: number;
  lastScanAt?: string;
}

export interface EntitlementCheckResult {
  allowed: boolean;
  reason?: string;
  remainingScans?: number;
  tier: UserTier;
}
