import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:image_picker/image_picker.dart';
import '../models/analysis_result.dart';

class ApiException implements Exception {
  final String message;
  final int? statusCode;
  final String? requestId;

  ApiException(this.message, {this.statusCode, this.requestId});

  @override
  String toString() => message;
}

class ApiService {
  // Standard-URL for Cloud Function
  static const String liveCloudFunctionUrl =
      'https://analyzeentity-ki66k6t3dq-uc.a.run.app';

  static String get defaultBaseUrl {
    return liveCloudFunctionUrl;
  }

  final String endpointUrl;
  final bool enableDevMock;

  ApiService({
    String? endpointUrl,
    this.enableDevMock = false,
  }) : endpointUrl = endpointUrl ?? defaultBaseUrl;

  /// Sender forespørsel til backend for multimodal analyse.
  /// Ved nettverks- eller serverfeil kastes en ApiException med en tydelig,
  /// forståelig feilmelding til brukeren.
  Future<FinalAnalysisReport> analyze({
    XFile? imageFile,
    String? manualQuery,
    String scanType = 'deep',
    bool standaloneDrMike = false,
  }) async {
    // Hvis eksplisitt satt i development/test
    if (kDebugMode && enableDevMock) {
      return _generateDevOnlyMockReport(imageFile: imageFile, query: manualQuery);
    }

    String? base64Image;
    String? mimeType;

    if (imageFile != null) {
      final bytes = await imageFile.readAsBytes();
      base64Image = base64Encode(bytes);
      mimeType = imageFile.name.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
    }

    final payload = <String, dynamic>{
      'scanType': scanType,
    };
    if (standaloneDrMike) {
      payload['standaloneDrMike'] = true;
    }
    if (base64Image != null) {
      payload['image'] = base64Image;
    }
    if (mimeType != null) {
      payload['mimeType'] = mimeType;
    }
    if (manualQuery != null && manualQuery.trim().isNotEmpty) {
      payload['query'] = manualQuery.trim();
    }

    if (!payload.containsKey('image') && !payload.containsKey('query')) {
      throw ApiException('Vennligst oppgi et bilde eller et søkeord.');
    }

    try {
      final response = await http
          .post(
            Uri.parse(endpointUrl),
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode(payload),
          )
          .timeout(const Duration(seconds: 45));

      if (response.statusCode >= 200 && response.statusCode < 300) {
        final Map<String, dynamic> data = jsonDecode(response.body);
        return FinalAnalysisReport.fromJson(data);
      }

      // Håndter spesifikke HTTP-statuskoder fra backend
      Map<String, dynamic>? errBody;
      try {
        errBody = jsonDecode(response.body);
      } catch (_) {}

      final serverMsg = errBody?['message'] as String?;
      final reqId = errBody?['requestId'] as String?;

      if (response.statusCode == 429) {
        throw ApiException(
          serverMsg ?? 'For mange forespørsler. Vennligst vent litt før du prøver igjen.',
          statusCode: 429,
          requestId: reqId,
        );
      }

      if (response.statusCode == 400) {
        throw ApiException(
          serverMsg ?? 'Ugyldig forespørsel. Sjekk at bildet eller søkeordet er riktig.',
          statusCode: 400,
          requestId: reqId,
        );
      }

      if (response.statusCode == 401) {
        throw ApiException(
          serverMsg ?? 'Sikkerhetsvalidering (App Check) feilet. Prøv igjen.',
          statusCode: 401,
          requestId: reqId,
        );
      }

      throw ApiException(
        serverMsg ?? 'Kunne ikke fullføre analysen (serverfeil ${response.statusCode}).',
        statusCode: response.statusCode,
        requestId: reqId,
      );
    } on SocketException {
      throw ApiException(
        'Ingen internettforbindelse. Sjekk at mobilen har WiFi eller mobildata aktivert.',
      );
    } on http.ClientException {
      throw ApiException(
        'Kunne ikke nå analyseserveren. Sjekk nettverksforbindelsen din og prøv på nytt.',
      );
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException(
        'Analysen kunne ikke gjennomføres: ${e.toString().replaceAll('Exception: ', '')}',
      );
    }
  }

  /// Eksplisitt kun tilgjengelig i kDebugMode dersom enableDevMock er eksplisitt satt.
  /// Kan aldri forveksles med en ekte analyse.
  FinalAnalysisReport _generateDevOnlyMockReport({
    XFile? imageFile,
    String? query,
  }) {
    return FinalAnalysisReport(
      id: 'dev-mock-${DateTime.now().millisecondsSinceEpoch}',
      analyzedAt: DateTime.now(),
      score: 50,
      trafficLight: TrafficLightColor.yellow,
      riskLevel: 'MODERAT',
      headline: '[DEV MOCK] Kun for testing i utviklingsmodus',
      executiveSummary:
          'Dette er en syntetisk testrapport generert lokalt fordi enableDevMock er aktivert under kDebugMode.',
      riskFactors: [
        AssessmentFactor(
          title: 'Simulert testdata',
          description: 'Rapporten er ikke produsert av analyseserveren.',
          severity: FactorSeverity.warning,
        ),
      ],
      positiveFactors: [],
      actionableAdvice: [
        'Kjør mot ekte backend for å få verifiserte resultater.',
      ],
      identifiedSubject: IdentifiedSubject(
        name: query?.isNotEmpty == true ? query : 'Simulert testobjekt',
      ),
    );
  }
}
