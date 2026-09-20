class EvidenceObject {
  final String id;
  final String category;
  final String claim;
  final String finding;
  final String verdict;
  final String sourceName;
  final String? sourceUrl;
  final String sourceType;
  final String retrievedAt;
  final String confidence;
  final String? supportingSnippet;

  EvidenceObject({
    required this.id,
    required this.category,
    required this.claim,
    required this.finding,
    required this.verdict,
    required this.sourceName,
    this.sourceUrl,
    required this.sourceType,
    required this.retrievedAt,
    required this.confidence,
    this.supportingSnippet,
  });

  factory EvidenceObject.fromJson(Map<String, dynamic> json) {
    return EvidenceObject(
      id: json['id'] ?? '',
      category: json['category'] ?? 'ANNET',
      claim: json['claim'] ?? '',
      finding: json['finding'] ?? '',
      verdict: json['verdict'] ?? 'IKKE_VERIFISERT',
      sourceName: json['sourceName'] ?? 'Ukjent kilde',
      sourceUrl: json['sourceUrl'],
      sourceType: json['sourceType'] ?? 'UKJENT',
      retrievedAt: json['retrievedAt'] ?? '',
      confidence: json['confidence'] ?? 'MODERATE',
      supportingSnippet: json['supportingSnippet'],
    );
  }
}

class ScoreCategoryDetail {
  final num score;
  final num maxScore;
  final num weightPercentage;
  final bool evaluated;
  final String summary;

  ScoreCategoryDetail({
    required this.score,
    required this.maxScore,
    required this.weightPercentage,
    required this.evaluated,
    required this.summary,
  });

  factory ScoreCategoryDetail.fromJson(Map<String, dynamic>? json) {
    if (json == null) {
      return ScoreCategoryDetail(
        score: 0,
        maxScore: 10,
        weightPercentage: 10,
        evaluated: false,
        summary: 'Ingen data tilgjengelig',
      );
    }
    return ScoreCategoryDetail(
      score: json['score'] ?? 0,
      maxScore: json['maxScore'] ?? 10,
      weightPercentage: json['weightPercentage'] ?? 10,
      evaluated: json['evaluated'] ?? false,
      summary: json['summary'] ?? '',
    );
  }
}

class TrustScoreBreakdown {
  final ScoreCategoryDetail businessIdentity;
  final ScoreCategoryDetail financialFootprint;
  final ScoreCategoryDetail digitalIdentity;
  final ScoreCategoryDetail consumerProtection;
  final ScoreCategoryDetail reviews;
  final ScoreCategoryDetail productTransparency;
  final ScoreCategoryDetail claimsAndEvidence;
  final ScoreCategoryDetail externalRiskSignals;

  TrustScoreBreakdown({
    required this.businessIdentity,
    required this.financialFootprint,
    required this.digitalIdentity,
    required this.consumerProtection,
    required this.reviews,
    required this.productTransparency,
    required this.claimsAndEvidence,
    required this.externalRiskSignals,
  });

  factory TrustScoreBreakdown.fromJson(Map<String, dynamic>? json) {
    return TrustScoreBreakdown(
      businessIdentity: ScoreCategoryDetail.fromJson(json?['businessIdentity']),
      financialFootprint: ScoreCategoryDetail.fromJson(json?['financialFootprint']),
      digitalIdentity: ScoreCategoryDetail.fromJson(json?['digitalIdentity']),
      consumerProtection: ScoreCategoryDetail.fromJson(json?['consumerProtection']),
      reviews: ScoreCategoryDetail.fromJson(json?['reviews']),
      productTransparency: ScoreCategoryDetail.fromJson(json?['productTransparency']),
      claimsAndEvidence: ScoreCategoryDetail.fromJson(json?['claimsAndEvidence']),
      externalRiskSignals: ScoreCategoryDetail.fromJson(json?['externalRiskSignals']),
    );
  }
}

class AnalysisConfidence {
  final String level;
  final int verifiedCategoriesCount;
  final int totalCategoriesCount;
  final String explanation;

  AnalysisConfidence({
    required this.level,
    required this.verifiedCategoriesCount,
    required this.totalCategoriesCount,
    required this.explanation,
  });

  factory AnalysisConfidence.fromJson(Map<String, dynamic>? json) {
    if (json == null) {
      return AnalysisConfidence(
        level: 'MODERATE',
        verifiedCategoriesCount: 0,
        totalCategoriesCount: 8,
        explanation: 'Standard konfidensnivå.',
      );
    }
    return AnalysisConfidence(
      level: json['level'] ?? 'MODERATE',
      verifiedCategoriesCount: json['verifiedCategoriesCount'] ?? 0,
      totalCategoriesCount: json['totalCategoriesCount'] ?? 8,
      explanation: json['explanation'] ?? '',
    );
  }
}

class HardRedFlag {
  final String id;
  final String title;
  final String description;
  final String source;
  final bool overridesScore;

  HardRedFlag({
    required this.id,
    required this.title,
    required this.description,
    required this.source,
    required this.overridesScore,
  });

  factory HardRedFlag.fromJson(Map<String, dynamic> json) {
    return HardRedFlag(
      id: json['id'] ?? '',
      title: json['title'] ?? '',
      description: json['description'] ?? '',
      source: json['source'] ?? '',
      overridesScore: json['overridesScore'] ?? false,
    );
  }
}

class TimelineEvent {
  final String yearOrDate;
  final String title;
  final String description;
  final bool verified;

  TimelineEvent({
    required this.yearOrDate,
    required this.title,
    required this.description,
    required this.verified,
  });

  factory TimelineEvent.fromJson(Map<String, dynamic> json) {
    return TimelineEvent(
      yearOrDate: json['yearOrDate'] ?? '',
      title: json['title'] ?? '',
      description: json['description'] ?? '',
      verified: json['verified'] ?? false,
    );
  }
}

class FinancialSubstance {
  final String status;
  final String summary;
  final String? revenueOrTurnover;
  final String? operatingResult;
  final String? equity;
  final int? employeeCount;
  final int? filingYearsCount;
  final List<String> accountingNotes;

  FinancialSubstance({
    required this.status,
    required this.summary,
    this.revenueOrTurnover,
    this.operatingResult,
    this.equity,
    this.employeeCount,
    this.filingYearsCount,
    required this.accountingNotes,
  });

  factory FinancialSubstance.fromJson(Map<String, dynamic>? json) {
    if (json == null) {
      return FinancialSubstance(
        status: 'INGEN_DATA',
        summary: 'Ingen offisielle regnskapsdata tilgjengelig.',
        accountingNotes: [],
      );
    }
    final notes = (json['accountingNotes'] as List<dynamic>?) ?? [];
    return FinancialSubstance(
      status: json['status'] ?? 'INGEN_DATA',
      summary: json['summary'] ?? '',
      revenueOrTurnover: json['revenueOrTurnover'],
      operatingResult: json['operatingResult'],
      equity: json['equity'],
      employeeCount: json['employeeCount'],
      filingYearsCount: json['filingYearsCount'],
      accountingNotes: notes.map((n) => n.toString()).toList(),
    );
  }
}

class ConsumerProtectionAudit {
  final String status;
  final String summary;
  final int? withdrawalPeriodDays;
  final bool hasPhysicalReturnAddress;
  final String? returnAddress;
  final bool vatAndDutiesIncluded;
  final List<String> paymentMethods;
  final bool hasCryptoOnlyWarning;
  final List<String> termsContradictions;

  ConsumerProtectionAudit({
    required this.status,
    required this.summary,
    this.withdrawalPeriodDays,
    required this.hasPhysicalReturnAddress,
    this.returnAddress,
    required this.vatAndDutiesIncluded,
    required this.paymentMethods,
    required this.hasCryptoOnlyWarning,
    required this.termsContradictions,
  });

  factory ConsumerProtectionAudit.fromJson(Map<String, dynamic>? json) {
    if (json == null) {
      return ConsumerProtectionAudit(
        status: 'MANGLER',
        summary: 'Ingen forbrukervilkår registrert.',
        hasPhysicalReturnAddress: false,
        vatAndDutiesIncluded: false,
        paymentMethods: [],
        hasCryptoOnlyWarning: false,
        termsContradictions: [],
      );
    }
    final methods = (json['paymentMethods'] as List<dynamic>?) ?? [];
    final contradictions = (json['termsContradictions'] as List<dynamic>?) ?? [];
    return ConsumerProtectionAudit(
      status: json['status'] ?? 'MANGLER',
      summary: json['summary'] ?? '',
      withdrawalPeriodDays: json['withdrawalPeriodDays'],
      hasPhysicalReturnAddress: json['hasPhysicalReturnAddress'] ?? false,
      returnAddress: json['returnAddress'],
      vatAndDutiesIncluded: json['vatAndDutiesIncluded'] ?? false,
      paymentMethods: methods.map((m) => m.toString()).toList(),
      hasCryptoOnlyWarning: json['hasCryptoOnlyWarning'] ?? false,
      termsContradictions: contradictions.map((c) => c.toString()).toList(),
    );
  }
}

class ReviewCluster {
  final String topic;
  final String sentiment;
  final String summary;
  final num frequencyPercentage;

  ReviewCluster({
    required this.topic,
    required this.sentiment,
    required this.summary,
    required this.frequencyPercentage,
  });

  factory ReviewCluster.fromJson(Map<String, dynamic> json) {
    return ReviewCluster(
      topic: json['topic'] ?? 'ANNET',
      sentiment: json['sentiment'] ?? 'BLANDET',
      summary: json['summary'] ?? '',
      frequencyPercentage: json['frequencyPercentage'] ?? 0,
    );
  }
}

class ReviewSimilarityAnomaly {
  final bool detected;
  final num similarityScore;
  final String similarityLevel;
  final String? sampleA;
  final String? sampleB;
  final String explanation;

  ReviewSimilarityAnomaly({
    required this.detected,
    required this.similarityScore,
    required this.similarityLevel,
    this.sampleA,
    this.sampleB,
    required this.explanation,
  });

  factory ReviewSimilarityAnomaly.fromJson(Map<String, dynamic>? json) {
    if (json == null) {
      return ReviewSimilarityAnomaly(
        detected: false,
        similarityScore: 0,
        similarityLevel: 'INGEN',
        explanation: 'Ingen anmeldelsesdata vurdert for anomalier.',
      );
    }
    return ReviewSimilarityAnomaly(
      detected: json['detected'] ?? false,
      similarityScore: json['similarityScore'] ?? 0,
      similarityLevel: json['similarityLevel'] ?? 'INGEN',
      sampleA: json['sampleA'],
      sampleB: json['sampleB'],
      explanation: json['explanation'] ?? '',
    );
  }
}

class RatingDistribution {
  final num fiveStarPct;
  final num fourStarPct;
  final num threeStarPct;
  final num twoStarPct;
  final num oneStarPct;

  RatingDistribution({
    required this.fiveStarPct,
    required this.fourStarPct,
    required this.threeStarPct,
    required this.twoStarPct,
    required this.oneStarPct,
  });

  factory RatingDistribution.fromJson(Map<String, dynamic>? json) {
    if (json == null) {
      return RatingDistribution(
        fiveStarPct: 0,
        fourStarPct: 0,
        threeStarPct: 0,
        twoStarPct: 0,
        oneStarPct: 0,
      );
    }
    return RatingDistribution(
      fiveStarPct: json['fiveStarPct'] ?? 0,
      fourStarPct: json['fourStarPct'] ?? 0,
      threeStarPct: json['threeStarPct'] ?? 0,
      twoStarPct: json['twoStarPct'] ?? 0,
      oneStarPct: json['oneStarPct'] ?? 0,
    );
  }
}

class ReviewVelocity {
  final int last30DaysCount;
  final int last90DaysCount;
  final bool hasUnusualSpike;
  final String? spikeExplanation;

  ReviewVelocity({
    required this.last30DaysCount,
    required this.last90DaysCount,
    required this.hasUnusualSpike,
    this.spikeExplanation,
  });

  factory ReviewVelocity.fromJson(Map<String, dynamic>? json) {
    if (json == null) {
      return ReviewVelocity(
        last30DaysCount: 0,
        last90DaysCount: 0,
        hasUnusualSpike: false,
      );
    }
    return ReviewVelocity(
      last30DaysCount: json['last30DaysCount'] ?? 0,
      last90DaysCount: json['last90DaysCount'] ?? 0,
      hasUnusualSpike: json['hasUnusualSpike'] ?? false,
      spikeExplanation: json['spikeExplanation'],
    );
  }
}

class ReviewIntelligenceReport {
  final int totalReviewCount;
  final num averageRating;
  final RatingDistribution ratingDistribution;
  final ReviewVelocity reviewVelocity;
  final List<ReviewCluster> clusters;
  final ReviewSimilarityAnomaly similarityAnomaly;

  ReviewIntelligenceReport({
    required this.totalReviewCount,
    required this.averageRating,
    required this.ratingDistribution,
    required this.reviewVelocity,
    required this.clusters,
    required this.similarityAnomaly,
  });

  factory ReviewIntelligenceReport.fromJson(Map<String, dynamic>? json) {
    if (json == null) {
      return ReviewIntelligenceReport(
        totalReviewCount: 0,
        averageRating: 0,
        ratingDistribution: RatingDistribution.fromJson(null),
        reviewVelocity: ReviewVelocity.fromJson(null),
        clusters: [],
        similarityAnomaly: ReviewSimilarityAnomaly.fromJson(null),
      );
    }
    final clList = (json['clusters'] as List<dynamic>?) ?? [];
    return ReviewIntelligenceReport(
      totalReviewCount: json['totalReviewCount'] ?? 0,
      averageRating: json['averageRating'] ?? 0,
      ratingDistribution: RatingDistribution.fromJson(json['ratingDistribution']),
      reviewVelocity: ReviewVelocity.fromJson(json['reviewVelocity']),
      clusters: clList.map((c) => ReviewCluster.fromJson(c as Map<String, dynamic>)).toList(),
      similarityAnomaly: ReviewSimilarityAnomaly.fromJson(json['similarityAnomaly']),
    );
  }
}

class ProductSupplyChainReport {
  final bool hasProductAnalysis;
  final String? detectedProductName;
  final String originMatch;
  final String originExplanation;
  final String regulatoryClassification;
  final String? ceMarkNotes;

  ProductSupplyChainReport({
    required this.hasProductAnalysis,
    this.detectedProductName,
    required this.originMatch,
    required this.originExplanation,
    required this.regulatoryClassification,
    this.ceMarkNotes,
  });

  factory ProductSupplyChainReport.fromJson(Map<String, dynamic>? json) {
    if (json == null) {
      return ProductSupplyChainReport(
        hasProductAnalysis: false,
        originMatch: 'NOT_APPLICABLE',
        originExplanation: 'Ingen produktanalyse utført.',
        regulatoryClassification: 'CONSUMER_GOODS',
      );
    }
    return ProductSupplyChainReport(
      hasProductAnalysis: json['hasProductAnalysis'] ?? false,
      detectedProductName: json['detectedProductName'],
      originMatch: json['originMatch'] ?? 'NOT_APPLICABLE',
      originExplanation: json['originExplanation'] ?? '',
      regulatoryClassification: json['regulatoryClassification'] ?? 'CONSUMER_GOODS',
      ceMarkNotes: json['ceMarkNotes'],
    );
  }
}

class DrMikeClaimVerification {
  final String claim;
  final String verdict;
  final String verdictLabel;
  final String evidenceLevel;
  final String evidenceQuality;
  final String whatTheEvidenceSays;
  final String? statisticalVsClinicalSignificance;
  final String? importantLimitation;
  final List<String> sources;

  DrMikeClaimVerification({
    required this.claim,
    required this.verdict,
    required this.verdictLabel,
    required this.evidenceLevel,
    required this.evidenceQuality,
    required this.whatTheEvidenceSays,
    this.statisticalVsClinicalSignificance,
    this.importantLimitation,
    required this.sources,
  });

  factory DrMikeClaimVerification.fromJson(Map<String, dynamic> json) {
    final sList = (json['sources'] as List<dynamic>?) ?? [];
    return DrMikeClaimVerification(
      claim: json['claim'] ?? '',
      verdict: json['verdict'] ?? 'INSUFFICIENT_EVIDENCE',
      verdictLabel: json['verdictLabel'] ?? 'Ikke verifisert',
      evidenceLevel: json['evidenceLevel'] ?? 'LEVEL_E_PRODUSENTENS_DATA',
      evidenceQuality: json['evidenceQuality'] ?? 'LOW',
      whatTheEvidenceSays: json['whatTheEvidenceSays'] ?? '',
      statisticalVsClinicalSignificance: json['statisticalVsClinicalSignificance'],
      importantLimitation: json['importantLimitation'],
      sources: sList.map((s) => s.toString()).toList(),
    );
  }
}

class DrMikeMedicalReport {
  final bool hasMedicalClaims;
  final String? doctorSummary;
  final String? overallDoctorVerdict;
  final List<DrMikeClaimVerification> claims;
  final String? disclaimer;

  DrMikeMedicalReport({
    required this.hasMedicalClaims,
    this.doctorSummary,
    this.overallDoctorVerdict,
    required this.claims,
    this.disclaimer,
  });

  factory DrMikeMedicalReport.fromJson(Map<String, dynamic>? json) {
    if (json == null) {
      return DrMikeMedicalReport(
        hasMedicalClaims: false,
        claims: [],
      );
    }
    final cList = (json['claims'] as List<dynamic>?) ?? [];
    return DrMikeMedicalReport(
      hasMedicalClaims: json['hasMedicalClaims'] ?? false,
      doctorSummary: json['doctorSummary'],
      overallDoctorVerdict: json['overallDoctorVerdict'],
      claims: cList.map((c) => DrMikeClaimVerification.fromJson(c as Map<String, dynamic>)).toList(),
      disclaimer: json['disclaimer'],
    );
  }
}

class TrustReportSubject {
  final String query;
  final String resolvedName;
  final String officialLegalName;
  final String? orgNumber;
  final String country;
  final String? websiteUrl;
  final String? registeredAddress;
  final String? establishedYear;

  TrustReportSubject({
    required this.query,
    required this.resolvedName,
    required this.officialLegalName,
    this.orgNumber,
    required this.country,
    this.websiteUrl,
    this.registeredAddress,
    this.establishedYear,
  });

  factory TrustReportSubject.fromJson(Map<String, dynamic>? json) {
    if (json == null) {
      return TrustReportSubject(
        query: '',
        resolvedName: 'Ukjent virksomhet',
        officialLegalName: 'Ukjent juridisk navn',
        country: 'Norge',
      );
    }
    return TrustReportSubject(
      query: json['query'] ?? '',
      resolvedName: json['resolvedName'] ?? 'Ukjent',
      officialLegalName: json['officialLegalName'] ?? 'Ukjent',
      orgNumber: json['orgNumber'],
      country: json['country'] ?? 'Norge',
      websiteUrl: json['websiteUrl'],
      registeredAddress: json['registeredAddress'],
      establishedYear: json['establishedYear'],
    );
  }
}

class ProductMatch {
  final String candidateProduct;
  final String? sourceUrl;
  final num similarity;
  final num? price;
  final String? currency;
  final String confidence;
  final String matchType;
  final String notes;

  ProductMatch({
    required this.candidateProduct,
    this.sourceUrl,
    required this.similarity,
    this.price,
    this.currency,
    required this.confidence,
    required this.matchType,
    required this.notes,
  });

  factory ProductMatch.fromJson(Map<String, dynamic> json) {
    return ProductMatch(
      candidateProduct: json['candidateProduct'] ?? '',
      sourceUrl: json['sourceUrl'],
      similarity: json['similarity'] ?? 0,
      price: json['price'],
      currency: json['currency'],
      confidence: json['confidence'] ?? 'MODERATE',
      matchType: json['matchType'] ?? 'UNVERIFIED',
      notes: json['notes'] ?? '',
    );
  }
}

class PriceIntelligence {
  final bool hasPriceAnalysis;
  final num? sellerPrice;
  final String? sellerCurrency;
  final num? minBenchmark;
  final num? maxBenchmark;
  final num? priceDifferencePercentage;
  final String priceVerdict;
  final List<ProductMatch> alternativeCandidates;
  final String importantNotice;

  PriceIntelligence({
    required this.hasPriceAnalysis,
    this.sellerPrice,
    this.sellerCurrency,
    this.minBenchmark,
    this.maxBenchmark,
    this.priceDifferencePercentage,
    required this.priceVerdict,
    required this.alternativeCandidates,
    required this.importantNotice,
  });

  factory PriceIntelligence.fromJson(Map<String, dynamic>? json) {
    if (json == null) {
      return PriceIntelligence(
        hasPriceAnalysis: false,
        priceVerdict: 'UNABLE_TO_DETERMINE',
        alternativeCandidates: [],
        importantNotice: '',
      );
    }
    final cands = (json['alternativeCandidates'] as List<dynamic>?) ?? [];
    return PriceIntelligence(
      hasPriceAnalysis: json['hasPriceAnalysis'] ?? false,
      sellerPrice: json['sellerPrice']?['amount'],
      sellerCurrency: json['sellerPrice']?['currency'],
      minBenchmark: json['similarProductsPriceRange']?['min'],
      maxBenchmark: json['similarProductsPriceRange']?['max'],
      priceDifferencePercentage: json['priceDifferencePercentage'],
      priceVerdict: json['priceVerdict'] ?? 'UNABLE_TO_DETERMINE',
      alternativeCandidates: cands.map((c) => ProductMatch.fromJson(c as Map<String, dynamic>)).toList(),
      importantNotice: json['importantNotice'] ?? '',
    );
  }
}

class PurchaseVerdict {
  final String canITrustThis;
  final String isItGoodValue;
  final String reviewsSummary;
  final String productTransparency;
  final String claimVerification;
  final String? drMikeVerdict;
  final String summaryHeadline;
  final String consumerGuidance;

  PurchaseVerdict({
    required this.canITrustThis,
    required this.isItGoodValue,
    required this.reviewsSummary,
    required this.productTransparency,
    required this.claimVerification,
    this.drMikeVerdict,
    required this.summaryHeadline,
    required this.consumerGuidance,
  });

  factory PurchaseVerdict.fromJson(Map<String, dynamic>? json) {
    if (json == null) {
      return PurchaseVerdict(
        canITrustThis: 'MODERAT_RISIKO',
        isItGoodValue: 'UNABLE_TO_DETERMINE',
        reviewsSummary: 'NORMAL',
        productTransparency: 'UNKNOWN',
        claimVerification: 'NOT_APPLICABLE',
        summaryHeadline: '',
        consumerGuidance: '',
      );
    }
    return PurchaseVerdict(
      canITrustThis: json['canITrustThis'] ?? 'MODERAT_RISIKO',
      isItGoodValue: json['isItGoodValue'] ?? 'UNABLE_TO_DETERMINE',
      reviewsSummary: json['reviewsSummary'] ?? 'NORMAL',
      productTransparency: json['productTransparency'] ?? 'UNKNOWN',
      claimVerification: json['claimVerification'] ?? 'NOT_APPLICABLE',
      drMikeVerdict: json['drMikeVerdict'],
      summaryHeadline: json['summaryHeadline'] ?? '',
      consumerGuidance: json['consumerGuidance'] ?? '',
    );
  }
}

class CostObservability {
  final String scanId;
  final String scanType;
  final int modelCalls;
  final List<String> modelsUsed;
  final int inputTokens;
  final int outputTokens;
  final int executionTimeMs;
  final int cacheHits;
  final int cacheMisses;
  final num estimatedCostUsd;
  final num estimatedCostNok;

  CostObservability({
    required this.scanId,
    required this.scanType,
    required this.modelCalls,
    required this.modelsUsed,
    required this.inputTokens,
    required this.outputTokens,
    required this.executionTimeMs,
    required this.cacheHits,
    required this.cacheMisses,
    required this.estimatedCostUsd,
    required this.estimatedCostNok,
  });

  factory CostObservability.fromJson(Map<String, dynamic>? json) {
    if (json == null) {
      return CostObservability(
        scanId: '',
        scanType: 'fast',
        modelCalls: 0,
        modelsUsed: [],
        inputTokens: 0,
        outputTokens: 0,
        executionTimeMs: 0,
        cacheHits: 0,
        cacheMisses: 0,
        estimatedCostUsd: 0,
        estimatedCostNok: 0,
      );
    }
    final mList = (json['modelsUsed'] as List<dynamic>?) ?? [];
    return CostObservability(
      scanId: json['scanId'] ?? '',
      scanType: json['scanType'] ?? 'fast',
      modelCalls: json['modelCalls'] ?? 0,
      modelsUsed: mList.map((m) => m.toString()).toList(),
      inputTokens: json['inputTokens'] ?? 0,
      outputTokens: json['outputTokens'] ?? 0,
      executionTimeMs: json['executionTimeMs'] ?? 0,
      cacheHits: json['cacheHits'] ?? 0,
      cacheMisses: json['cacheMisses'] ?? 0,
      estimatedCostUsd: json['estimatedCostUsd'] ?? 0,
      estimatedCostNok: json['estimatedCostNok'] ?? 0,
    );
  }
}

class TrustReport {
  final String id;
  final DateTime analyzedAt;
  final TrustReportSubject subject;
  final int trustScore; // 0-100
  final String riskLevel; // 'LAV_RISIKO' | 'MODERAT_RISIKO' | 'HOY_RISIKO' | 'KRITISK_RISIKO'
  final AnalysisConfidence confidence;
  final TrustScoreBreakdown scoreBreakdown;
  final String executiveSummary;
  final List<String> whatWeFound;
  final List<String> watchOut;
  final List<HardRedFlag> hardRedFlags;
  final List<TimelineEvent> timeline;
  final FinancialSubstance financialSubstance;
  final ConsumerProtectionAudit consumerProtection;
  final ReviewIntelligenceReport reviewIntelligence;
  final ProductSupplyChainReport productSupplyChain;
  final DrMikeMedicalReport drMikeMedical;
  final PriceIntelligence? priceIntelligence;
  final PurchaseVerdict? purchaseVerdict;
  final String? scanType;
  final CostObservability? costObservability;
  final List<EvidenceObject> evidenceChain;

  TrustReport({
    required this.id,
    required this.analyzedAt,
    required this.subject,
    required this.trustScore,
    required this.riskLevel,
    required this.confidence,
    required this.scoreBreakdown,
    required this.executiveSummary,
    required this.whatWeFound,
    required this.watchOut,
    required this.hardRedFlags,
    required this.timeline,
    required this.financialSubstance,
    required this.consumerProtection,
    required this.reviewIntelligence,
    required this.productSupplyChain,
    required this.drMikeMedical,
    this.priceIntelligence,
    this.purchaseVerdict,
    this.scanType,
    this.costObservability,
    required this.evidenceChain,
  });

  factory TrustReport.fromJson(Map<String, dynamic> json) {
    final whatList = (json['whatWeFound'] as List<dynamic>?) ?? [];
    final watchList = (json['watchOut'] as List<dynamic>?) ?? [];
    final flagsList = (json['hardRedFlags'] as List<dynamic>?) ?? [];
    final timeList = (json['timeline'] as List<dynamic>?) ?? [];
    final evList = (json['evidenceChain'] as List<dynamic>?) ?? [];

    return TrustReport(
      id: json['id'] ?? '',
      analyzedAt: json['analyzedAt'] != null
          ? DateTime.tryParse(json['analyzedAt']) ?? DateTime.now()
          : DateTime.now(),
      subject: TrustReportSubject.fromJson(json['subject']),
      trustScore: (json['trustScore'] is num) ? (json['trustScore'] as num).toInt() : 50,
      riskLevel: json['riskLevel'] ?? 'MODERAT_RISIKO',
      confidence: AnalysisConfidence.fromJson(json['confidence']),
      scoreBreakdown: TrustScoreBreakdown.fromJson(json['scoreBreakdown']),
      executiveSummary: json['executiveSummary'] ?? '',
      whatWeFound: whatList.map((w) => w.toString()).toList(),
      watchOut: watchList.map((w) => w.toString()).toList(),
      hardRedFlags: flagsList.map((f) => HardRedFlag.fromJson(f as Map<String, dynamic>)).toList(),
      timeline: timeList.map((t) => TimelineEvent.fromJson(t as Map<String, dynamic>)).toList(),
      financialSubstance: FinancialSubstance.fromJson(json['financialSubstance']),
      consumerProtection: ConsumerProtectionAudit.fromJson(json['consumerProtection']),
      reviewIntelligence: ReviewIntelligenceReport.fromJson(json['reviewIntelligence']),
      productSupplyChain: ProductSupplyChainReport.fromJson(json['productSupplyChain']),
      drMikeMedical: DrMikeMedicalReport.fromJson(json['drMikeMedical']),
      priceIntelligence: json['priceIntelligence'] != null
          ? PriceIntelligence.fromJson(json['priceIntelligence'] as Map<String, dynamic>)
          : null,
      purchaseVerdict: json['purchaseVerdict'] != null
          ? PurchaseVerdict.fromJson(json['purchaseVerdict'] as Map<String, dynamic>)
          : null,
      scanType: json['scanType'],
      costObservability: json['costObservability'] != null
          ? CostObservability.fromJson(json['costObservability'] as Map<String, dynamic>)
          : null,
      evidenceChain: evList.map((e) => EvidenceObject.fromJson(e as Map<String, dynamic>)).toList(),
    );
  }
}
