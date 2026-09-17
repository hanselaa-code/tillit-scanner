import { GoogleGenerativeAI } from '@google/generative-ai';
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

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY || '';
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
    }
    // gemini-2.5-flash eller gemini-1.5-flash som fallback
    this.modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  }

  /**
   * Steg 1: Visjonsanalyse på opplastet skjermbilde/bilde
   */
  public async analyzeImage(imageBase64: string, mimeType: string = 'image/jpeg'): Promise<VisionAnalysisResult> {
    if (!this.genAI) {
      return this.mockVisionAnalysis(imageBase64);
    }

    try {
      const model = this.genAI.getGenerativeModel({
        model: this.modelName,
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      });

      const prompt = `
Du er en ledende multimodal rettsmedisinsk svindel- og forfalskningsanalytiker for norske forbrukere (ScanSafe / Tillit).
Analyser dette bildet nøye (kan være skjermbilde av Instagram/Facebook/TikTok-annonse, plakat, e-post, SMS, eller nettbutikk).

Svar KUN med et gyldig JSON-objekt med nøyaktig denne strukturen:
{
  "extractedText": "all synlig tekst ekstrahert nøyaktig",
  "identifiedBrands": ["merkevarer som hevdes å stå bak eller etterlignes, f.eks. 'DNB', 'Posten', 'VG']",
  "detectedUrls": ["eventuelle nettadresser, lenker eller domener synlig i bildet"],
  "detectedOrgNumbers": ["eventuelle 9-sifrede norske organisasjonsnumre funnet"],
  "visualRedFlags": [
    {
      "title": "Kort tittel på faresignal (f.eks. 'Falsk nyhetsartikkel', 'Manipulert kjendisutsagn', 'Aggressivt tidspress')",
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
          data: imageBase64.replace(/^data:image\/\w+;base64,/, ''),
          mimeType,
        },
      };

      const result = await model.generateContent([prompt, imagePart]);
      const text = result.response.text();
      return JSON.parse(text) as VisionAnalysisResult;
    } catch (error: any) {
      console.error('Gemini vision analysis failed, using structured fallback:', error.message);
      return this.mockVisionAnalysis(imageBase64);
    }
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

  private mockVisionAnalysis(base64: string): VisionAnalysisResult {
    // Hvis API-nøkkel ikke er satt ennå, returner realistiske dummy-funn for demonstrasjon
    const isMockScam = base64.length % 2 === 0;
    return {
      extractedText: isMockScam 
        ? 'SENASJONELT: Kjendis avslører hemmelig investering i Dagsrevyen! Begrenset tilbud, kun 5 plasser igjen!'
        : 'Velkommen til Nordisk Helse & Velvære AS. Org.nr: 923456789. Besøk vår nettbutikk.',
      identifiedBrands: isMockScam ? ['NRK', 'Dagsrevyen'] : ['Nordisk Helse'],
      detectedUrls: isMockScam ? ['https://invester-kjapt.top/signup'] : ['https://nordiskhelse.no'],
      detectedOrgNumbers: isMockScam ? [] : ['923456789'],
      visualRedFlags: isMockScam
        ? [
            {
              title: 'Manipulert nyhetsdesign',
              description: 'Bildet bruker et visuelt oppsett som minner om NRK Dagsrevyen for å skape falsk troverdighet.',
              severity: 'high',
            },
            {
              title: 'Aggressivt tidspress',
              description: 'Påstand om at det kun er «5 plasser igjen» brukes ofte for å hindre at offeret tenker seg om.',
              severity: 'medium',
            },
          ]
        : [],
      summaryOfContent: isMockScam
        ? 'Mistenkelig annonse som fremstiller en investeringsmulighet ved hjelp av falsk redaksjonell troverdighet.'
        : 'Legitimt markedsføringsmateriell for en registrert norsk aktør.',
      hasSuspiciousVisualDesign: isMockScam,
    };
  }
}
