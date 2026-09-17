import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';
import {
  VisionAnalysisResult,
  BrregCheckResult,
  DomainCheckResult,
  ReputationCheckResult,
  FinalAnalysisReport,
  TrafficLightColor,
  RiskLevel,
  AssessmentFactor,
} from '../types/analysis.types';

export class GeminiService {
  private genAI: GoogleGenerativeAI | null = null;
  private modelName: string;
  private visionApiKey: string;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY || '';
    this.visionApiKey = process.env.GOOGLE_VISION_API_KEY || apiKey;
    if (apiKey) {
      try {
        this.genAI = new GoogleGenerativeAI(apiKey);
      } catch (e) {
        this.genAI = null;
      }
    }
    this.modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  }

  /**
   * Steg 1: Ekte visjonsanalyse via Google Cloud Vision API og multimodal KI
   */
  public async analyzeImage(imageBase64: string, mimeType: string = 'image/jpeg'): Promise<VisionAnalysisResult> {
    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    // 1. Forsøk ekte Google Cloud Vision OCR og logogjenkjenning
    if (this.visionApiKey) {
      try {
        const visionResponse = await axios.post(
          `https://vision.googleapis.com/v1/images:annotate?key=${this.visionApiKey}`,
          {
            requests: [
              {
                image: { content: cleanBase64 },
                features: [
                  { type: 'TEXT_DETECTION' },
                  { type: 'LOGO_DETECTION' }
                ],
              },
            ],
          },
          { timeout: 15000 }
        );

        const annotation = visionResponse.data?.responses?.[0];
        const fullText = annotation?.fullTextAnnotation?.text || '';
        const detectedLogos: string[] = (annotation?.logoAnnotations || [])
          .map((logo: any) => logo.description)
          .filter(Boolean);

        return this.parseVisionTextAndLogos(fullText, detectedLogos);
      } catch (visionError: any) {
        console.warn('Google Cloud Vision OCR feilet:', visionError.message);
      }
    }

    // 2. Forsøk Gemini Vision hvis konfigurert
    if (this.genAI) {
      try {
        const model = this.genAI.getGenerativeModel({
          model: this.modelName,
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.1,
          },
        });

        const prompt = `
Du er en multimodal svindel- og forfalskningsanalytiker for norske forbrukere (ScanSafe / Tillit).
Analyser dette bildet nøye (kan være skjermbilde av Instagram/Facebook/TikTok-annonse, plakat, e-post, SMS, eller nettbutikk).

Svar KUN med et gyldig JSON-objekt med nøyaktig denne strukturen:
{
  "extractedText": "all synlig tekst ekstrahert nøyaktig",
  "identifiedBrands": ["merkevarer som hevdes å stå bak eller etterlignes"],
  "detectedUrls": ["eventuelle nettadresser, lenker eller domener synlig i bildet"],
  "detectedOrgNumbers": ["eventuelle 9-sifrede norske organisasjonsnumre funnet"],
  "visualRedFlags": [
    {
      "title": "Kort tittel på faresignal",
      "description": "Konkret objektiv beskrivelse av hva som er observert i bildet",
      "severity": "low" | "medium" | "high"
    }
  ],
  "summaryOfContent": "Kort objektiv oppsummering av hva bildet fremstiller på norsk",
  "hasSuspiciousVisualDesign": true/false
}
`;

        const imagePart = {
          inlineData: {
            data: cleanBase64,
            mimeType,
          },
        };

        const result = await model.generateContent([prompt, imagePart]);
        const text = result.response.text();
        return JSON.parse(text) as VisionAnalysisResult;
      } catch (geminiError: any) {
        console.warn('Gemini vision feilet:', geminiError.message);
      }
    }

    // 3. Hvis verken Vision eller Gemini fant noe
    return {
      extractedText: '',
      identifiedBrands: [],
      detectedUrls: [],
      detectedOrgNumbers: [],
      visualRedFlags: [],
      summaryOfContent: 'Kunne ikke hente ut tekst eller kjente merkevarer fra bildet.',
      hasSuspiciousVisualDesign: false,
    };
  }

  /**
   * Steg 2: Helhetlig scoring og objektiv forbrukeranbefaling
   */
  public async synthesizeReport(params: {
    id: string;
    query?: string;
    vision?: VisionAnalysisResult;
    brreg?: BrregCheckResult;
    domain?: DomainCheckResult;
    reputation?: ReputationCheckResult;
  }): Promise<FinalAnalysisReport> {
    const { id, query, vision, brreg, domain, reputation } = params;

    if (!this.genAI) {
      return this.calculateHeuristicScore(id, query, vision, brreg, domain, reputation);
    }

    try {
      const model = this.genAI.getGenerativeModel({
        model: this.modelName,
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      });

      const prompt = `
Du er overdommer og sjefanalytiker i ScanSafe / Tillit.
Ditt oppdrag er å gi en objektiv, balansert og juridisk forsvarlig forbrukervurdering basert på aggregerte data.
Bruk formuleringer som «Risikovurdering indikerer...», «Observasjon av...» fremfor ærekrenkende bastante påstander.

Inndata:
- Brukerforespørsel: ${JSON.stringify(query || 'Bildeanalyse')}
- Visjonsanalyse fra bilde: ${JSON.stringify(vision || null)}
- Data fra Brønnøysundregistrene (Enhetsregisteret): ${JSON.stringify(brreg || null)}
- Domene- og nettadressevalidering: ${JSON.stringify(domain || null)}
- Omdømme- og varslingssjekk: ${JSON.stringify(reputation || null)}

Generer en seriøsitetsscore fra 0 til 100:
- 0–39: HØY RISIKO (RØD). Typisk: Falsk merkevare, kjent svindelmønster, konkursrammet foretak, mistenkelig domene, ingen reell bedrift bak.
- 40–69: MODERAT RISIKO / VÆR OPPMERKSOM (GUL). Typisk: Nystiftet foretak, manglende MVA, ufullstendig kontaktinfo, uklare vilkår.
- 70–100: LAV RISIKO / ETABLERT (GRØNN). Typisk: Etablert norsk AS med historikk, aktivt MVA-registrert, offisielt domene.

Returner KUN gyldig JSON med følgende struktur:
{
  "score": number, // 0-100
  "trafficLight": "GREEN" | "YELLOW" | "RED",
  "riskLevel": "LAV" | "MODERAT" | "HØY",
  "headline": "Klar, forbrukervennlig tittel",
  "executiveSummary": "Objektiv oppsummering av funnene (2-3 setninger)",
  "riskFactors": [
    {
      "title": "Tittel på risikofaktor",
      "description": "Detaljert forklaring",
      "severity": "info" | "warning" | "danger"
    }
  ],
  "positiveFactors": [
    {
      "title": "Tittel på trygghetsfaktor",
      "description": "Detaljert forklaring",
      "severity": "info"
    }
  ],
  "actionableAdvice": [
    "Konkret råd 1 til forbrukeren",
    "Konkret råd 2 til forbrukeren"
  ],
  "identifiedSubject": {
    "name": "Navn på bedrift/aktør",
    "orgNumber": "9-sifret orgnr hvis relevant",
    "websiteUrl": "Nettadresse hvis relevant"
  }
}
`;

      const response = await model.generateContent(prompt);
      const data = JSON.parse(response.response.text());

      return {
        id,
        analyzedAt: new Date().toISOString(),
        score: Math.min(100, Math.max(0, Number(data.score) || 50)),
        trafficLight: data.trafficLight || 'YELLOW',
        riskLevel: data.riskLevel || 'MODERAT',
        headline: data.headline || 'Risikovurdering gjennomført',
        executiveSummary: data.executiveSummary || 'Vurdering basert på tilgjengelige kilder.',
        riskFactors: data.riskFactors || [],
        positiveFactors: data.positiveFactors || [],
        actionableAdvice: data.actionableAdvice || ['Vær aktsom ved oppgitte betalingsopplysninger.'],
        identifiedSubject: data.identifiedSubject || {},
        brreg,
        domain,
        vision,
        reputation,
      };
    } catch (err: any) {
      console.warn('Gemini synthesis failed, falling back to heuristic engine:', err.message);
      return this.calculateHeuristicScore(id, query, vision, brreg, domain, reputation);
    }
  }

  /**
   * Deterministisk heuristikk-motor (brukes ved offline-modus eller manglende API-nøkkel)
   */
  private calculateHeuristicScore(
    id: string,
    query?: string,
    vision?: VisionAnalysisResult,
    brreg?: BrregCheckResult,
    domain?: DomainCheckResult,
    reputation?: ReputationCheckResult
  ): FinalAnalysisReport {
    let score = 75; // Nøytralt utgangspunkt
    const riskFactors: AssessmentFactor[] = [];
    const positiveFactors: AssessmentFactor[] = [];
    const actionableAdvice: string[] = [];

    // Brreg evaluering
    if (brreg?.found && brreg.entity) {
      positiveFactors.push({
        title: 'Registrert i Enhetsregisteret',
        description: `${brreg.entity.navn} (org.nr ${brreg.entity.organisasjonsnummer}) er formelt registrert i Brønnøysundregistrene.`,
        severity: 'info',
      });
      score += 15;

      if (brreg.isRegisteredInMva) {
        positiveFactors.push({
          title: 'Aktivt i MVA-registeret',
          description: 'Foretaket er oppført i Merverdiavgiftsregisteret hos Skatteetaten.',
          severity: 'info',
        });
        score += 5;
      } else {
        riskFactors.push({
          title: 'Ikke registrert i MVA-registeret',
          description: 'Foretaket er ikke registrert for merverdiavgift. Dette er normalt kun for omsetning under 50 000 kr eller unntatte bransjer.',
          severity: 'warning',
        });
        score -= 10;
      }

      if (brreg.isDissolvedOrBankrupt) {
        riskFactors.push({
          title: 'Kritisk: Foretak under avvikling eller konkurs',
          description: 'Enhetsregisteret melder at foretaket er under avvikling, tvangsoppløsning eller konkurs.',
          severity: 'danger',
        });
        score -= 60;
      }

      if (brreg.ageYears !== undefined && brreg.ageYears < 0.5) {
        riskFactors.push({
          title: 'Nystiftet selskap',
          description: 'Foretaket har eksistert i under et halvt år. Mange svindelsider opprettes bak helt ferske foretak.',
          severity: 'warning',
        });
        score -= 15;
      }
    } else if (brreg?.searchedQuery) {
      riskFactors.push({
        title: 'Ikke funnet i Brønnøysundregistrene',
        description: `Kunne ikke finne noe norsk registrert selskap med navnet eller nummeret «${brreg.searchedQuery}».`,
        severity: 'warning',
      });
      score -= 20;
    }

    // Domene evaluering
    if (domain) {
      if (domain.isSuspiciousTld) {
        riskFactors.push({
          title: 'Høyrisiko toppdomene',
          description: `Nettstedet bruker et toppdomene med hyppig misbruk i svindel og phishing.`,
          severity: 'danger',
        });
        score -= 25;
      }
      if (!domain.isHttps) {
        riskFactors.push({
          title: 'Mangler sikker HTTPS-kryptering',
          description: 'Nettforbindelsen er ukryptert. Ikke legg inn betalingskort eller personopplysninger.',
          severity: 'danger',
        });
        score -= 30;
      }
      if (!domain.dnsResolved && domain.domain) {
        riskFactors.push({
          title: 'Ugyldig eller inaktivt domene',
          description: 'Domenenavnet svarer ikke på nettforespørsler.',
          severity: 'warning',
        });
        score -= 15;
      }
    }

    // Visjonsfeil
    if (vision?.visualRedFlags && vision.visualRedFlags.length > 0) {
      for (const flag of vision.visualRedFlags) {
        riskFactors.push({
          title: flag.title,
          description: flag.description,
          severity: flag.severity === 'high' ? 'danger' : 'warning',
        });
        score -= flag.severity === 'high' ? 30 : 15;
      }
    }

    // Omdømme
    if (reputation?.isKnownScam) {
      riskFactors.push({
        title: 'Kjent svindelmønster identifisert',
        description: 'Teksten eller innholdet samsvarer med publiserte advarsler fra Forbrukertilsynet.',
        severity: 'danger',
      });
      score -= 40;
    }

    // Begrens score mellom 0 og 100
    score = Math.max(0, Math.min(100, score));

    let trafficLight: TrafficLightColor = 'GREEN';
    let riskLevel: RiskLevel = 'LAV';
    let headline = 'Lav risiko identifisert';
    let executiveSummary = 'Foretaket og nettstedet fremstår velprøvd og registrert i offentlige registre.';

    if (score < 40) {
      trafficLight = 'RED';
      riskLevel = 'HØY';
      headline = 'Advarsel: Høy risiko identifisert';
      executiveSummary = 'Analysen avdekket flere kritiske faresignaler som ofte kjennetegner svindel, falske aktører eller useriøs virksomhet.';
      actionableAdvice.push('Ikke oppgi BankID, betalingskort eller personopplysninger.');
      actionableAdvice.push('Ikke overfør penger via Vipps eller bankoverføring på forskudd.');
      actionableAdvice.push('Rapporter eventuell mistenkelig annonse til plattformen den ble vist på.');
    } else if (score < 70) {
      trafficLight = 'YELLOW';
      riskLevel = 'MODERAT';
      headline = 'Vær oppmerksom: Moderat risiko';
      executiveSummary = 'Det er registrert enkelte usikkerhetsmomenter som tilsier at du bør utvise ekstra aktsomhet før kjøp eller avtaleinngåelse.';
      actionableAdvice.push('Sjekk uavhengige omtaler på Google eller Trustpilot før du handler.');
      actionableAdvice.push('Bruk alltid kredittkort ved kjøp på nett, slik at du er dekket av Finansavtaleloven § 2-1.');
      actionableAdvice.push('Bekreft at kontaktinformasjon og returadresse oppgitt på nettsiden er reell.');
    } else {
      actionableAdvice.push('Foretaket fremstår etablert, men benytt alltid ordinære forbrukerrettigheter og sikre betalingskanaler.');
    }

    const subjectName = brreg?.entity?.navn || vision?.identifiedBrands[0] || query || 'Ukjent aktør';

    return {
      id,
      analyzedAt: new Date().toISOString(),
      score,
      trafficLight,
      riskLevel,
      headline,
      executiveSummary,
      riskFactors,
      positiveFactors,
      actionableAdvice,
      identifiedSubject: {
        name: subjectName,
        orgNumber: brreg?.entity?.organisasjonsnummer,
        websiteUrl: domain?.domain,
      },
      brreg,
      domain,
      vision,
      reputation,
    };
  }

  private parseVisionTextAndLogos(fullText: string, detectedLogos: string[]): VisionAnalysisResult {
    const cleanText = fullText.trim();
    const lowerText = cleanText.toLowerCase();

    // 1. Gjenkjenn nettadresser og domener
    const urlRegex = /(?:https?:\/\/)?(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(?:\/[^\s]*)?/gi;
    const rawUrls = cleanText.match(urlRegex) || [];
    const detectedUrls = Array.from(new Set(rawUrls.map(u => u.trim()))).filter(
      u => !u.endsWith('.jpg') && !u.endsWith('.png') && !u.endsWith('.jpeg')
    );

    // 2. Gjenkjenn 9-sifrede norske organisasjonsnumre
    const orgRegex = /\b(\d{3}\s?\d{3}\s?\d{3})\b/g;
    const orgMatches = cleanText.match(orgRegex) || [];
    const detectedOrgNumbers = Array.from(new Set(orgMatches.map(m => m.replace(/\s+/g, '')))).filter(
      num => num.length === 9
    );

    // 3. Merkevarer (logos + kjente merkevarer + overskrift/header)
    const identifiedBrands: string[] = [...detectedLogos];

    // Norske og vanlige UI-ord, navigasjon og preposisjoner som ALDRI skal tolkes som firmanavn
    const UI_STOPWORDS = new Set([
      'meny', 'menu', 'hjem', 'home', 'søk', 'search', 'finn butikk', 'finn',
      'logg inn', 'login', 'logg ut', 'logout', 'favoritter', 'favorites',
      'handlekurv', 'kurv', 'cart', 'kasse', 'checkout', 'kjøp', 'bestill',
      'kundeservice', 'kontakt', 'kontakt oss', 'om oss', 'vilkår', 'betingelser',
      'personvern', 'cookies', 'frakt', 'retur', 'levering', 'produkter',
      'artikler', 'kategorier', 'tilbud', 'salg', 'kampanje', 'pris', 'kr', 'nok',
      'rabatt', 'gavekort', 'åpningstider', 'om produktet', 'anmeld', 'overvåk',
      'utsolgt', 'på lager', 'klikk her', 'last ned', 'app', 'online', 'mer', 'se her',
      'i', 'på', 'til', 'for', 'med', 'av', 'fra', 'om', 'over', 'under', 'ved',
      'mot', 'etter', 'før', 'uten', 'hos', 'mellom', 'rundt', 'gjennom', 'blant',
      'gratis', 'ny', 'nye', 'alt', 'alle', 'ingen', 'mange', 'mest', 'vår', 'våre',
      'din', 'ditt', 'dine', 'min', 'mitt', 'mine', 'og', 'eller', 'men', 'som', 'at'
    ]);

    const isUIStopword = (word: string): boolean => {
      const clean = word.toLowerCase().replace(/[^a-zæøå0-9]/g, '').trim();
      return UI_STOPWORDS.has(clean);
    };

    // 1. Prioriter etablerte kjente handelsaktører i teksten først
    const knownBrands = [
      'Kicks', 'Vipps', 'DNB', 'Posten', 'PostNord', 'Elkjøp', 'Komplett',
      'Skatteetaten', 'Politiet', 'Helsenorge', 'NAV', 'Finn.no', 'Telenor',
      'Telia', 'SpareBank 1', 'Nordea', 'Storebrand', 'Gjensidige', 'NRK',
      'VG', 'Dagbladet', 'TV 2', 'Norwegian', 'SAS', 'Coop', 'Rema 1000',
      'Zalando', 'Boozt', 'Jula', 'Biltema', 'Clas Ohlson', 'XXL', 'Sport 1',
      'Fjellsport', 'Farmasiet', 'Apotek 1', 'Outland', 'Norli', 'Ark', 'Lyko'
    ];

    for (const brand of knownBrands) {
      const regex = new RegExp(`\\b${brand}\\b`, 'i');
      if (regex.test(cleanText) && !identifiedBrands.some(b => b.toLowerCase() === brand.toLowerCase())) {
        identifiedBrands.push(brand);
      }
    }

    // 2. Analyser overskrifts- og topplinjer (Header detection)
    const lines = cleanText.split('\n').map(l => l.trim()).filter(Boolean);
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      const line = lines[i];
      const stripped = line.replace(/^[=☰\-_#\*\s]+/, '').trim();
      if (!stripped || isUIStopword(stripped)) continue;

      const words = stripped.split(/\s+/);
      if (words.length <= 2 && stripped.length >= 2 && stripped.length <= 25) {
        if (!/^\d+([.,]\d+)?\s*(kr|nok|%)?$/i.test(stripped) && !stripped.toLowerCase().startsWith('fri frakt')) {
          const candidate = words[0].replace(/[^a-zA-ZæøåÆØÅ0-9]/g, '');
          if (!isUIStopword(candidate) && candidate.length >= 2) {
            if (!identifiedBrands.some(b => b.toLowerCase() === candidate.toLowerCase())) {
              identifiedBrands.push(candidate);
            }
          }
        }
      }
    }

    // 3. Søk etter ord foran "Club", "Klubb", "Store" (f.eks. "KICKS Club")
    const clubMatch = cleanText.match(/([A-ZÆØÅ][a-zA-ZæøåÆØÅ0-9]{2,})\s+(Club|Klubb|Retail|Store)/);
    if (clubMatch) {
      const brand = clubMatch[1];
      if (!isUIStopword(brand) && !identifiedBrands.some(b => b.toLowerCase() === brand.toLowerCase())) {
        identifiedBrands.push(brand);
      }
    }

    // 4. Faresignaler i teksten
    const visualRedFlags: any[] = [];

    // Falske nyheter / kjendis
    if (
      (lowerText.includes('avslør') || lowerText.includes('hemmelighet') || lowerText.includes('skandale')) &&
      (lowerText.includes('tjente') || lowerText.includes('million') || lowerText.includes('rik') || lowerText.includes('invester'))
    ) {
      visualRedFlags.push({
        title: 'Manipulert kjendisutsagn eller sensasjonspåstand',
        description: 'Teksten inneholder typiske formuleringer fra falske nyhetsartikler og kjendissvindler.',
        severity: 'high',
      });
    }

    // Phishing / sperret konto
    if (
      lowerText.includes('sperret') ||
      lowerText.includes('oppgi bankid') ||
      lowerText.includes('bekreft kort') ||
      lowerText.includes('sikkerhetsoppdatering') ||
      (lowerText.includes('pakke') && (lowerText.includes('tollgebyr') || lowerText.includes('forsinket') || lowerText.includes('levering feilet')))
    ) {
      visualRedFlags.push({
        title: 'Mistenkelig hastevarsel / phishing-mønster',
        description: 'Meldingen etterligner typiske phishing-forsøk om sperret konto eller pakkelevering.',
        severity: 'high',
      });
    }

    // Aggressivt tidspress
    if (
      lowerText.includes('kun få plasser') ||
      lowerText.includes('kun 3 plasser') ||
      lowerText.includes('kun 5 plasser') ||
      lowerText.includes('begrenset antall') ||
      lowerText.includes('i kveld før midnatt') ||
      lowerText.includes('siste sjanse')
    ) {
      visualRedFlags.push({
        title: 'Aggressivt tidspress',
        description: 'Teksten forsøker å framprovosere overilte handlinger ved å påstå ekstrem tidsnød eller plassmangel.',
        severity: 'medium',
      });
    }

    // Mistenkelig TLD i tekst
    const suspiciousTlds = ['.top', '.xyz', '.cfd', '.click', '.buzz', '.monster', '.vip', '.rest'];
    if (detectedUrls.some(u => suspiciousTlds.some(tld => u.toLowerCase().includes(tld)))) {
      visualRedFlags.push({
        title: 'Høyrisiko toppdomene funnet i bildet',
        description: 'Nettadressen bruker et toppdomene (.top, .xyz osv.) som svært ofte knyttes til svindelkampanjer.',
        severity: 'high',
      });
    }

    let summaryOfContent = '';
    if (cleanText.length > 0) {
      summaryOfContent = cleanText.length > 120 
        ? `${cleanText.slice(0, 120)}...` 
        : cleanText;
    } else {
      summaryOfContent = 'Ingen lesbar tekst eller kjente merkevarer ble oppdaget i bildet.';
    }

    return {
      extractedText: cleanText,
      identifiedBrands,
      detectedUrls,
      detectedOrgNumbers,
      visualRedFlags,
      summaryOfContent,
      hasSuspiciousVisualDesign: visualRedFlags.length > 0,
    };
  }
}
