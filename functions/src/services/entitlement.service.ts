import {
  UserTier,
  FeatureFlags,
  EntitlementLimits,
  EntitlementCheckResult,
  UserUsageState,
} from '../types/entitlement.types';
import { ScanType } from '../types/purchase-intelligence.types';

export class EntitlementService {
  private static featureFlags: FeatureFlags = {
    drMikeEnabled: true,
    productIntelligenceEnabled: true,
    priceComparisonEnabled: true,
    deepScanEnabled: true,
    subscriptionsEnabled: false, // Avslått som standard inntil betalingsflyt aktiveres
    businessMonitoringEnabled: false,
  };

  private static tierLimits: Record<UserTier, EntitlementLimits> = {
    FREE: {
      tier: 'FREE',
      monthlyFastScans: 20,
      monthlyDeepScans: 5,
      canUseDrMike: true,
      canViewPriceAlternatives: true,
      canExportReports: false,
      canMonitorCompanies: false,
    },
    PRO: {
      tier: 'PRO',
      monthlyFastScans: 200,
      monthlyDeepScans: 60,
      canUseDrMike: true,
      canViewPriceAlternatives: true,
      canExportReports: true,
      canMonitorCompanies: false,
    },
    BUSINESS: {
      tier: 'BUSINESS',
      monthlyFastScans: 1000,
      monthlyDeepScans: 500,
      canUseDrMike: true,
      canViewPriceAlternatives: true,
      canExportReports: true,
      canMonitorCompanies: true,
    },
  };

  // In-memory usage store (kan synkes med Firestore ved behov)
  private static usageMap = new Map<string, UserUsageState>();

  public static isFeatureEnabled(feature: keyof FeatureFlags): boolean {
    return this.featureFlags[feature];
  }

  public static updateFeatureFlags(newFlags: Partial<FeatureFlags>): void {
    this.featureFlags = { ...this.featureFlags, ...newFlags };
  }

  public static getTierLimits(tier: UserTier): EntitlementLimits {
    return this.tierLimits[tier] || this.tierLimits.FREE;
  }

  public static updateTierLimits(tier: UserTier, newLimits: Partial<EntitlementLimits>): void {
    if (this.tierLimits[tier]) {
      this.tierLimits[tier] = { ...this.tierLimits[tier], ...newLimits };
    }
  }

  public static checkEntitlement(
    userId: string = 'anonymous',
    scanType: ScanType = 'fast',
    tier: UserTier = 'FREE'
  ): EntitlementCheckResult {
    // Hvis abonnement/betalingsmur ikke er aktivert globalt, tillat alle søk
    if (!this.featureFlags.subscriptionsEnabled) {
      return { allowed: true, tier };
    }

    if (scanType === 'deep' && !this.featureFlags.deepScanEnabled) {
      return {
        allowed: false,
        reason: 'Deep Scan er for øyeblikket deaktivert.',
        tier,
      };
    }

    const limits = this.getTierLimits(tier);
    const usage = this.getUserUsage(userId, tier);

    if (scanType === 'fast') {
      const remaining = Math.max(0, limits.monthlyFastScans - usage.fastScansUsed);
      if (usage.fastScansUsed >= limits.monthlyFastScans) {
        return {
          allowed: false,
          reason: `Månedlig kvote for Fast Scans er nådd (${limits.monthlyFastScans} søk).`,
          remainingScans: 0,
          tier,
        };
      }
      return { allowed: true, remainingScans: remaining, tier };
    } else {
      const remaining = Math.max(0, limits.monthlyDeepScans - usage.deepScansUsed);
      if (usage.deepScansUsed >= limits.monthlyDeepScans) {
        return {
          allowed: false,
          reason: `Månedlig kvote for Deep Scans er nådd (${limits.monthlyDeepScans} analyser).`,
          remainingScans: 0,
          tier,
        };
      }
      return { allowed: true, remainingScans: remaining, tier };
    }
  }

  public static recordScanUsage(userId: string = 'anonymous', scanType: ScanType = 'fast', tier: UserTier = 'FREE'): void {
    const usage = this.getUserUsage(userId, tier);
    if (scanType === 'fast') {
      usage.fastScansUsed++;
    } else {
      usage.deepScansUsed++;
    }
    usage.lastScanAt = new Date().toISOString();
  }

  private static getUserUsage(userId: string, tier: UserTier): UserUsageState {
    const currentMonthKey = new Date().toISOString().substring(0, 7); // YYYY-MM
    const key = `${userId}::${currentMonthKey}`;

    let usage = this.usageMap.get(key);
    if (!usage) {
      usage = {
        userId,
        tier,
        currentMonthKey,
        fastScansUsed: 0,
        deepScansUsed: 0,
      };
      this.usageMap.set(key, usage);
    }
    return usage;
  }
}
