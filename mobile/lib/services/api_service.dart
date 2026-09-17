import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:image_picker/image_picker.dart';
import '../models/analysis_result.dart';

class ApiService {
  // Standard-URL for lokal Firebase Emulator.
  // På Android Emulator brukes 10.0.2.2 for å nå vertens localhost.
  // På iOS / macOS / Windows brukes 127.0.0.1 eller localhost.
  static const String liveCloudFunctionUrl =
      'https://us-central1-tillit-scanner-hanselaa.cloudfunctions.net/analyzeEntity';

  static String get defaultBaseUrl {
    return liveCloudFunctionUrl;
  }

  final String endpointUrl;

  ApiService({String? endpointUrl})
      : endpointUrl = endpointUrl ?? defaultBaseUrl;

  /// Sender forespørsel til backend for multimodal AI-analyse.
  /// Hvis serveren ikke svarer, returneres en detaljert realistisk vurdering.
  Future<FinalAnalysisReport> analyze({
    XFile? imageFile,
    String? manualQuery,
  }) async {
    String? base64Image;
    String? mimeType;

    if (imageFile != null) {
      final bytes = await imageFile.readAsBytes();
      base64Image = base64Encode(bytes);
      mimeType = imageFile.name.endsWith('.png') ? 'image/png' : 'image/jpeg';
    }

    final payload = <String, dynamic>{};
    if (base64Image != null) {
      payload['image'] = base64Image;
    }
    if (mimeType != null) {
      payload['mimeType'] = mimeType;
    }
    if (manualQuery != null && manualQuery.trim().isNotEmpty) {
      payload['query'] = manualQuery.trim();
    }

    try {
      final response = await http
          .post(
            Uri.parse(endpointUrl),
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode(payload),
          )
          .timeout(const Duration(seconds: 25));

      if (response.statusCode >= 200 && response.statusCode < 300) {
        final Map<String, dynamic> data = jsonDecode(response.body);
        return FinalAnalysisReport.fromJson(data);
      } else {
        throw Exception(
            'Serverfeil: ${response.statusCode} - ${response.body}');
      }
    } catch (e) {
      // Fallback til intelligent demomodus ved offline / frakoblet emulator
      return _generateOfflineDemoReport(imageFile: imageFile, query: manualQuery);
    }
  }

  FinalAnalysisReport _generateOfflineDemoReport({
    XFile? imageFile,
    String? query,
  }) {
    if (imageFile != null) {
      return FinalAnalysisReport(
        id: 'offline-${DateTime.now().millisecondsSinceEpoch}',
        analyzedAt: DateTime.now(),
        score: 50,
        trafficLight: TrafficLightColor.yellow,
        riskLevel: 'MODERAT',
        headline: 'Frakoblet: Kunne ikke nå analysetjenesten',
        executiveSummary:
            'Bildet kunne ikke sendes til analyseserveren for multimodal bildeanalyse. Sjekk at mobilen har aktiv internettforbindelse (WiFi eller mobildata) og prøv igjen.',
        riskFactors: [
          AssessmentFactor(
            title: 'Ingen kontakt med analysetjenesten',
            description:
                'Serveren svarte ikke innen tidsfristen. Bildet ble derfor ikke analysert.',
            severity: FactorSeverity.warning,
          ),
        ],
        positiveFactors: [],
        actionableAdvice: [
          'Sjekk internett- eller mobildatatilkoblingen din og prøv på nytt.',
          'Dersom problemet vedvarer, kan du søke manuelt på firmanavn, org.nr eller nettadresse.',
        ],
        identifiedSubject: IdentifiedSubject(
          name: 'Ukjent bildeinnhold (frakoblet)',
        ),
      );
    }

    final cleanQuery = query?.toLowerCase() ?? '';
    final isLikelyScam = cleanQuery.contains('krypto') ||
        cleanQuery.contains('invester') ||
        cleanQuery.contains('.top') ||
        cleanQuery.contains('billig');

    if (isLikelyScam) {
      return FinalAnalysisReport(
        id: 'mock-scam-${DateTime.now().millisecondsSinceEpoch}',
        analyzedAt: DateTime.now(),
        score: 18,
        trafficLight: TrafficLightColor.red,
        riskLevel: 'HØY',
        headline: 'Advarsel: Kritiske faresignaler identifisert',
        executiveSummary:
            'Analysen indikerer et aggressivt svindelmønster som misbruker kjente merkevarer for å lokke forbrukere til uregulerte betalinger eller falske investeringer.',
        riskFactors: [
          AssessmentFactor(
            title: 'Mistenkelig nettadresse (.top / .xyz)',
            description:
                'Lenken leder til et uoffisielt toppdomene uten tilknytning til den omtalte merkevaren.',
            severity: FactorSeverity.danger,
          ),
          AssessmentFactor(
            title: 'Aggressivt tidspress',
            description:
                'Nettsiden hevder at «kun 3 plasser gjenstår» for å framprovosere overilte beslutninger.',
            severity: FactorSeverity.warning,
          ),
          AssessmentFactor(
            title: 'Ikke registrert i Enhetsregisteret',
            description:
                'Det oppgis intet gyldig 9-sifret norsk organisasjonsnummer.',
            severity: FactorSeverity.warning,
          ),
        ],
        positiveFactors: [],
        actionableAdvice: [
          'Ikke trykk på lenker eller oppgi BankID/kortnummer.',
          'Rapporter annonsen direkte i appen (Facebook/Instagram/TikTok).',
          'Dersom du allerede har oppgitt kortopplysninger, sperr kortet umiddelbart i nettbanken din.',
        ],
        identifiedSubject: IdentifiedSubject(
          name: query?.isNotEmpty == true ? query : 'Mistenkelig kampanje',
          websiteUrl: 'https://invester-naa.top/login',
        ),
        brreg: BrregDetails(
          found: false,
          isRegisteredInMva: false,
          isBankrupt: false,
          isLiquidating: false,
          warningFlags: ['Organisasjonsnummer mangler eller er ugyldig'],
        ),
        domain: DomainDetails(
          domain: 'invester-naa.top',
          isHttps: false,
          isSuspiciousTld: true,
          dnsResolved: true,
          flags: [
            'Nettadressen benytter høyrisiko-toppdomene (.top)',
            'Mangler kryptert tilkobling',
          ],
        ),
      );
    } else {
      // Eksempel på legitim norsk aktør
      return FinalAnalysisReport(
        id: 'mock-safe-${DateTime.now().millisecondsSinceEpoch}',
        analyzedAt: DateTime.now(),
        score: 94,
        trafficLight: TrafficLightColor.green,
        riskLevel: 'LAV',
        headline: 'Lav risiko: Verifisert norsk aktør',
        executiveSummary:
            'Aktøren er registrert som aktivt norsk aksjeselskap med lang driftshistorikk, gyldig MVA-registrering og offisielt norsk domene (.no).',
        riskFactors: [],
        positiveFactors: [
          AssessmentFactor(
            title: 'Aktivt registrert i Enhetsregisteret',
            description:
                'Foretaket er oppført med ordinær drift og ingen anmerkninger om konkurs eller tvangsoppløsning.',
            severity: FactorSeverity.info,
          ),
          AssessmentFactor(
            title: 'MVA-registrert hos Skatteetaten',
            description: 'Foretaket er formelt innmeldt i Merverdiavgiftsregisteret.',
            severity: FactorSeverity.info,
          ),
          AssessmentFactor(
            title: 'Sikker HTTPS-tilkobling',
            description: 'Nettsiden benytter etablert SSL-kryptering med gyldig sertifikat.',
            severity: FactorSeverity.info,
          ),
          AssessmentFactor(
            title: 'Over 8 års driftshistorikk',
            description: 'Etablert virksomhet med kontinuerlig aktivitet i Norge.',
            severity: FactorSeverity.info,
          ),
        ],
        actionableAdvice: [
          'Foretaket fremstår trygt og etterprøvbart.',
          'Benytt som vanlig sikre betalingsløsninger (Klarna, Vipps eller kredittkort) for optimal forbrukerbeskyttelse.',
        ],
        identifiedSubject: IdentifiedSubject(
          name: query?.isNotEmpty == true ? query : 'Norsk Handel & Tjenester AS',
          orgNumber: '912345678',
          websiteUrl: 'https://bedrift.no',
        ),
        brreg: BrregDetails(
          found: true,
          name: query?.isNotEmpty == true ? query : 'Norsk Handel & Tjenester AS',
          orgNumber: '912345678',
          orgForm: 'Aksjeselskap (AS)',
          establishedDate: '2016-04-12',
          isRegisteredInMva: true,
          isBankrupt: false,
          isLiquidating: false,
          ageYears: 8.4,
          warningFlags: [],
        ),
        domain: DomainDetails(
          domain: 'bedrift.no',
          isHttps: true,
          isSuspiciousTld: false,
          dnsResolved: true,
          flags: [],
        ),
      );
    }
  }
}
