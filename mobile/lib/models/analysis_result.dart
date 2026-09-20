import 'package:flutter/material.dart';
import 'trust_report.dart';

enum TrafficLightColor { green, yellow, red }

enum FactorSeverity { info, warning, danger }

class AssessmentFactor {
  final String title;
  final String description;
  final FactorSeverity severity;

  AssessmentFactor({
    required this.title,
    required this.description,
    required this.severity,
  });

  factory AssessmentFactor.fromJson(Map<String, dynamic> json) {
    FactorSeverity parseSeverity(String? val) {
      switch (val?.toLowerCase()) {
        case 'danger':
          return FactorSeverity.danger;
        case 'warning':
          return FactorSeverity.warning;
        default:
          return FactorSeverity.info;
      }
    }

    return AssessmentFactor(
      title: json['title'] ?? '',
      description: json['description'] ?? '',
      severity: parseSeverity(json['severity']),
    );
  }

  Map<String, dynamic> toJson() => {
        'title': title,
        'description': description,
        'severity': severity.name,
      };
}

class IdentifiedSubject {
  final String? name;
  final String? legalName;
  final String? tradeName;
  final String? relationship;
  final String? orgNumber;
  final String? websiteUrl;
  final String? detectedProduct;

  IdentifiedSubject({
    this.name,
    this.legalName,
    this.tradeName,
    this.relationship,
    this.orgNumber,
    this.websiteUrl,
    this.detectedProduct,
  });

  factory IdentifiedSubject.fromJson(Map<String, dynamic>? json) {
    if (json == null) return IdentifiedSubject();
    return IdentifiedSubject(
      name: json['name'],
      legalName: json['legalName'],
      tradeName: json['tradeName'],
      relationship: json['relationship'],
      orgNumber: json['orgNumber'],
      websiteUrl: json['websiteUrl'],
      detectedProduct: json['detectedProduct'],
    );
  }
}

class BrregDetails {
  final bool found;
  final String? orgNumber;
  final String? name;
  final String? orgForm;
  final String? establishedDate;
  final bool isRegisteredInMva;
  final bool isBankrupt;
  final bool isLiquidating;
  final double? ageYears;
  final List<String> warningFlags;

  BrregDetails({
    required this.found,
    this.orgNumber,
    this.name,
    this.orgForm,
    this.establishedDate,
    required this.isRegisteredInMva,
    required this.isBankrupt,
    required this.isLiquidating,
    this.ageYears,
    required this.warningFlags,
  });

  factory BrregDetails.fromJson(Map<String, dynamic>? json) {
    if (json == null) {
      return BrregDetails(
        found: false,
        isRegisteredInMva: false,
        isBankrupt: false,
        isLiquidating: false,
        warningFlags: [],
      );
    }

    final entity = json['entity'] as Map<String, dynamic>?;
    return BrregDetails(
      found: json['found'] ?? false,
      orgNumber: entity?['organisasjonsnummer'],
      name: entity?['navn'],
      orgForm: entity?['organisasjonsform']?['beskrivelse'],
      establishedDate: entity?['stiftelsesdato'] ?? entity?['registreringsdatoEnhetsregisteret'],
      isRegisteredInMva: json['isRegisteredInMva'] ?? false,
      isBankrupt: entity?['konkurs'] ?? false,
      isLiquidating: entity?['underAvvikling'] ?? false,
      ageYears: (json['ageYears'] is num) ? (json['ageYears'] as num).toDouble() : null,
      warningFlags: List<String>.from(json['warningFlags'] ?? []),
    );
  }
}

class DomainDetails {
  final String domain;
  final bool isHttps;
  final bool isSuspiciousTld;
  final bool dnsResolved;
  final List<String> flags;

  DomainDetails({
    required this.domain,
    required this.isHttps,
    required this.isSuspiciousTld,
    required this.dnsResolved,
    required this.flags,
  });

  factory DomainDetails.fromJson(Map<String, dynamic>? json) {
    if (json == null) {
      return DomainDetails(
        domain: '',
        isHttps: false,
        isSuspiciousTld: false,
        dnsResolved: false,
        flags: [],
      );
    }
    return DomainDetails(
      domain: json['domain'] ?? '',
      isHttps: json['isHttps'] ?? false,
      isSuspiciousTld: json['isSuspiciousTld'] ?? false,
      dnsResolved: json['dnsResolved'] ?? false,
      flags: List<String>.from(json['flags'] ?? []),
    );
  }
}

class VisionDetails {
  final String extractedText;
  final List<String> identifiedBrands;
  final List<String> detectedUrls;
  final List<String> detectedOrgNumbers;
  final List<AssessmentFactor> visualRedFlags;
  final String summaryOfContent;
  final bool hasSuspiciousVisualDesign;

  VisionDetails({
    required this.extractedText,
    required this.identifiedBrands,
    required this.detectedUrls,
    required this.detectedOrgNumbers,
    required this.visualRedFlags,
    required this.summaryOfContent,
    required this.hasSuspiciousVisualDesign,
  });

  factory VisionDetails.fromJson(Map<String, dynamic>? json) {
    if (json == null) {
      return VisionDetails(
        extractedText: '',
        identifiedBrands: [],
        detectedUrls: [],
        detectedOrgNumbers: [],
        visualRedFlags: [],
        summaryOfContent: '',
        hasSuspiciousVisualDesign: false,
      );
    }

    final flagsJson = (json['visualRedFlags'] as List<dynamic>?) ?? [];
    return VisionDetails(
      extractedText: json['extractedText'] ?? '',
      identifiedBrands: List<String>.from(json['identifiedBrands'] ?? []),
      detectedUrls: List<String>.from(json['detectedUrls'] ?? []),
      detectedOrgNumbers: List<String>.from(json['detectedOrgNumbers'] ?? []),
      visualRedFlags: flagsJson
          .map((f) => AssessmentFactor.fromJson(f as Map<String, dynamic>))
          .toList(),
      summaryOfContent: json['summaryOfContent'] ?? '',
      hasSuspiciousVisualDesign: json['hasSuspiciousVisualDesign'] ?? false,
    );
  }
}

class GoogleReviewSnippet {
  final String? authorName;
  final double? rating;
  final String? relativePublishTimeDescription;
  final String? text;

  GoogleReviewSnippet({
    this.authorName,
    this.rating,
    this.relativePublishTimeDescription,
    this.text,
  });

  factory GoogleReviewSnippet.fromJson(Map<String, dynamic> json) {
    return GoogleReviewSnippet(
      authorName: json['authorName'],
      rating: (json['rating'] is num) ? (json['rating'] as num).toDouble() : null,
      relativePublishTimeDescription: json['relativePublishTimeDescription'],
      text: json['text'],
    );
  }
}

class GoogleReviewInfo {
  final bool found;
  final String? placeName;
  final double? rating;
  final int? userRatingCount;
  final String? formattedAddress;
  final String? googleMapsUri;
  final List<GoogleReviewSnippet> recentReviews;

  GoogleReviewInfo({
    required this.found,
    this.placeName,
    this.rating,
    this.userRatingCount,
    this.formattedAddress,
    this.googleMapsUri,
    required this.recentReviews,
  });

  factory GoogleReviewInfo.fromJson(Map<String, dynamic>? json) {
    if (json == null) {
      return GoogleReviewInfo(found: false, recentReviews: []);
    }
    final reviewsJson = (json['recentReviews'] as List<dynamic>?) ?? [];
    return GoogleReviewInfo(
      found: json['found'] ?? false,
      placeName: json['placeName'],
      rating: (json['rating'] is num) ? (json['rating'] as num).toDouble() : null,
      userRatingCount: (json['userRatingCount'] is num) ? (json['userRatingCount'] as num).toInt() : null,
      formattedAddress: json['formattedAddress'],
      googleMapsUri: json['googleMapsUri'],
      recentReviews: reviewsJson
          .map((r) => GoogleReviewSnippet.fromJson(r as Map<String, dynamic>))
          .toList(),
    );
  }
}

class TrustpilotInfo {
  final String? url;
  final String? domain;

  TrustpilotInfo({this.url, this.domain});

  factory TrustpilotInfo.fromJson(Map<String, dynamic>? json) {
    if (json == null) return TrustpilotInfo();
    return TrustpilotInfo(
      url: json['url'],
      domain: json['domain'],
    );
  }
}

class ReviewsDetails {
  final GoogleReviewInfo? google;
  final TrustpilotInfo? trustpilot;
  final String? summary;
  final List<String> warningFlags;
  final List<String> positiveFlags;

  ReviewsDetails({
    this.google,
    this.trustpilot,
    this.summary,
    required this.warningFlags,
    required this.positiveFlags,
  });

  factory ReviewsDetails.fromJson(Map<String, dynamic>? json) {
    if (json == null) {
      return ReviewsDetails(warningFlags: [], positiveFlags: []);
    }
    return ReviewsDetails(
      google: json['google'] != null ? GoogleReviewInfo.fromJson(json['google']) : null,
      trustpilot: json['trustpilot'] != null ? TrustpilotInfo.fromJson(json['trustpilot']) : null,
      summary: json['summary'],
      warningFlags: List<String>.from(json['warningFlags'] ?? []),
      positiveFlags: List<String>.from(json['positiveFlags'] ?? []),
    );
  }
}

enum MedicalClaimVerdict {
  documented,
  partiallyDocumented,
  undocumented,
  misleading,
  myth,
  dangerous,
}

class MedicalClaimFactCheck {
  final String claim;
  final MedicalClaimVerdict verdict;
  final String scientificExplanation;
  final String evidenceLevel;
  final List<String> sourcesOrConsensus;

  MedicalClaimFactCheck({
    required this.claim,
    required this.verdict,
    required this.scientificExplanation,
    required this.evidenceLevel,
    required this.sourcesOrConsensus,
  });

  factory MedicalClaimFactCheck.fromJson(Map<String, dynamic> json) {
    MedicalClaimVerdict parseVerdict(String? val) {
      switch (val?.toUpperCase()) {
        case 'DOKUMENTERT':
          return MedicalClaimVerdict.documented;
        case 'DELVIS_DOKUMENTERT':
          return MedicalClaimVerdict.partiallyDocumented;
        case 'UDOKUMENTERT':
          return MedicalClaimVerdict.undocumented;
        case 'VILLEDENDE':
          return MedicalClaimVerdict.misleading;
        case 'MYTE':
          return MedicalClaimVerdict.myth;
        case 'FARLIG':
          return MedicalClaimVerdict.dangerous;
        default:
          return MedicalClaimVerdict.undocumented;
      }
    }

    return MedicalClaimFactCheck(
      claim: json['claim'] ?? '',
      verdict: parseVerdict(json['verdict']),
      scientificExplanation: json['scientificExplanation'] ?? '',
      evidenceLevel: json['evidenceLevel'] ?? 'Ingen påvist effekt',
      sourcesOrConsensus: List<String>.from(json['sourcesOrConsensus'] ?? []),
    );
  }

  String get verdictLabel {
    switch (verdict) {
      case MedicalClaimVerdict.documented:
        return 'Dokumentert';
      case MedicalClaimVerdict.partiallyDocumented:
        return 'Delvis dokumentert';
      case MedicalClaimVerdict.undocumented:
        return 'Udokumentert påstand';
      case MedicalClaimVerdict.misleading:
        return 'Villedende markedsføring';
      case MedicalClaimVerdict.myth:
        return 'Medisinsk myte';
      case MedicalClaimVerdict.dangerous:
        return 'Advarsel: Potensielt farlig';
    }
  }

  Color get verdictColor {
    switch (verdict) {
      case MedicalClaimVerdict.documented:
        return const Color(0xFF10B981); // Emerald
      case MedicalClaimVerdict.partiallyDocumented:
        return const Color(0xFFF59E0B); // Amber
      case MedicalClaimVerdict.undocumented:
        return const Color(0xFFF97316); // Orange
      case MedicalClaimVerdict.misleading:
      case MedicalClaimVerdict.myth:
        return const Color(0xFFEF4444); // Red
      case MedicalClaimVerdict.dangerous:
        return const Color(0xFFDC2626); // Dark Red
    }
  }

  IconData get verdictIcon {
    switch (verdict) {
      case MedicalClaimVerdict.documented:
        return Icons.check_circle_rounded;
      case MedicalClaimVerdict.partiallyDocumented:
        return Icons.help_outline_rounded;
      case MedicalClaimVerdict.undocumented:
        return Icons.warning_amber_rounded;
      case MedicalClaimVerdict.misleading:
      case MedicalClaimVerdict.myth:
        return Icons.cancel_rounded;
      case MedicalClaimVerdict.dangerous:
        return Icons.dangerous_rounded;
    }
  }
}

class MedicalExpertReview {
  final bool hasMedicalClaims;
  final String doctorSummary;
  final String overallVerdict;
  final List<MedicalClaimFactCheck> claims;
  final String disclaimer;

  MedicalExpertReview({
    required this.hasMedicalClaims,
    required this.doctorSummary,
    required this.overallVerdict,
    required this.claims,
    required this.disclaimer,
  });

  factory MedicalExpertReview.fromJson(Map<String, dynamic>? json) {
    if (json == null) {
      return MedicalExpertReview(
        hasMedicalClaims: false,
        doctorSummary: '',
        overallVerdict: '',
        claims: [],
        disclaimer: '',
      );
    }

    final claimsList = (json['claims'] as List<dynamic>?) ?? [];

    return MedicalExpertReview(
      hasMedicalClaims: json['hasMedicalClaims'] ?? false,
      doctorSummary: json['doctorSummary'] ?? '',
      overallVerdict: json['overallVerdict'] ?? '',
      claims: claimsList
          .map((c) => MedicalClaimFactCheck.fromJson(c as Map<String, dynamic>))
          .toList(),
      disclaimer: json['disclaimer'] ?? '',
    );
  }
}

class FinalAnalysisReport {
  final String id;
  final DateTime analyzedAt;
  final int score; // 0-100
  final TrafficLightColor trafficLight;
  final String riskLevel; // 'LAV' | 'MODERAT' | 'HØY'
  final String headline;
  final String executiveSummary;
  final List<AssessmentFactor> riskFactors;
  final List<AssessmentFactor> positiveFactors;
  final List<String> actionableAdvice;
  final IdentifiedSubject identifiedSubject;
  final BrregDetails? brreg;
  final DomainDetails? domain;
  final VisionDetails? vision;
  final ReviewsDetails? reviews;
  final MedicalExpertReview? medicalReview;
  final TrustReport? trustReport;

  FinalAnalysisReport({
    required this.id,
    required this.analyzedAt,
    required this.score,
    required this.trafficLight,
    required this.riskLevel,
    required this.headline,
    required this.executiveSummary,
    required this.riskFactors,
    required this.positiveFactors,
    required this.actionableAdvice,
    required this.identifiedSubject,
    this.brreg,
    this.domain,
    this.vision,
    this.reviews,
    this.medicalReview,
    this.trustReport,
  });

  factory FinalAnalysisReport.fromJson(Map<String, dynamic> json) {
    TrafficLightColor parseColor(String? val) {
      switch (val?.toUpperCase()) {
        case 'RED':
          return TrafficLightColor.red;
        case 'YELLOW':
          return TrafficLightColor.yellow;
        case 'GREEN':
        default:
          return TrafficLightColor.green;
      }
    }

    final riskList = (json['riskFactors'] as List<dynamic>?) ?? [];
    final posList = (json['positiveFactors'] as List<dynamic>?) ?? [];
    final adviceList = (json['actionableAdvice'] as List<dynamic>?) ?? [];

    return FinalAnalysisReport(
      id: json['id'] ?? 'scan-unknown',
      analyzedAt: json['analyzedAt'] != null
          ? DateTime.tryParse(json['analyzedAt']) ?? DateTime.now()
          : DateTime.now(),
      score: (json['score'] is num) ? (json['score'] as num).toInt() : 50,
      trafficLight: parseColor(json['trafficLight']),
      riskLevel: json['riskLevel'] ?? 'MODERAT',
      headline: json['headline'] ?? 'Analyse fullført',
      executiveSummary: json['executiveSummary'] ?? '',
      riskFactors: riskList
          .map((f) => AssessmentFactor.fromJson(f as Map<String, dynamic>))
          .toList(),
      positiveFactors: posList
          .map((f) => AssessmentFactor.fromJson(f as Map<String, dynamic>))
          .toList(),
      actionableAdvice: adviceList.map((a) => a.toString()).toList(),
      identifiedSubject: IdentifiedSubject.fromJson(json['identifiedSubject']),
      brreg: json['brreg'] != null ? BrregDetails.fromJson(json['brreg']) : null,
      domain: json['domain'] != null ? DomainDetails.fromJson(json['domain']) : null,
      vision: json['vision'] != null ? VisionDetails.fromJson(json['vision']) : null,
      reviews: json['reviews'] != null ? ReviewsDetails.fromJson(json['reviews']) : null,
      medicalReview: json['medicalReview'] != null
          ? MedicalExpertReview.fromJson(json['medicalReview'])
          : null,
      trustReport: json['trustReport'] != null
          ? TrustReport.fromJson(json['trustReport'] as Map<String, dynamic>)
          : null,
    );
  }

  Color get statusColor {
    switch (trafficLight) {
      case TrafficLightColor.green:
        return const Color(0xFF10B981); // Emerald 500
      case TrafficLightColor.yellow:
        return const Color(0xFFF59E0B); // Amber 500
      case TrafficLightColor.red:
        return const Color(0xFFEF4444); // Red 500
    }
  }
}

