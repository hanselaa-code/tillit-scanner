import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';
import {
  VisionAnalysisResult,
  BrregCheckResult,
  DomainCheckResult,
  ReputationCheckResult,
  ReviewsCheckResult,
  FinalAnalysisReport,
  TrafficLightColor,
  RiskLevel,
  AssessmentFactor,
  MedicalExpertReview,
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
  "hasSuspiciousVisualDesign": true/false,
  "detectedHealthClaims": ["eventuelle konkrete helsepåstander, mirakelløfter, vekttapspåstander, ingredienser eller medisinske effekter som loves i bildet"]
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
    reviews?: ReviewsCheckResult;
    detectedProduct?: string;
  }): Promise<FinalAnalysisReport> {
    const { id, query, vision, brreg, domain, reputation, reviews, detectedProduct } = params;

    if (!this.genAI) {
      return this.calculateHeuristicScore(id, query, vision, brreg, domain, reputation, reviews, detectedProduct);
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
Du har en todelt oppgave:
1. Sjefanalytiker for forbrukersikkerhet og svindel (ScanSafe / Tillit): Gi en objektiv, balansert og juridisk forsvarlig vurdering av selskaper, nettsteder og kommersiell legitimitet.
2. Doctor Mike-stil lege og medisinsk ekspert:
   Dersom inndataene (tekst, bilde, produkt, annonse eller nettside) inneholder helsepåstander, kosttilskudd, kosmetikk/anti-aging, legemidler, vekttap, smertelindring, fysiologiske løfter eller alternative behandlinger:
   - Innta rollen som en engasjert, pedagogisk og evidensbasert lege inspirert av Doctor Mike (Dr. Mikhail Varshavski).
   - Tone: Nysgjerrig, varm, folkelig og pedagogisk, men nådeløst presis mot pseudovitenskap, urealistiske fysiologiske løfter og markedsføringstriks ("La oss se på hva biologien og fagfellevurdert forskning faktisk sier her...").
   - Identifiser og plukk fra hverandre konkrete påstander (claims) i annonsen.
   - Faktasjekk hver påstand mot solid forskning og anerkjent medisinsk konsensus (EFSA, Cochrane Reviews, Helsedirektoratet, Statens legemiddelverk / Direktoratet for medisinske produkter DMP, PubMed/NIH).
   - Sett en klar dom for hvert krav:
     * DOKUMENTERT: Solid vitenskapelig belegg / EFSA-godkjent helsepåstand
     * DELVIS_DOKUMENTERT: Noe indikasjon/svak effekt, men overdrevet i reklamen
     * UDOKUMENTERT: Mangler klinisk dokumentasjon på mennesker
     * VILLEDENDE: Vrir på forskning, bruker irrelevante studier eller lover umulige resultater
     * MYTE: Biologisk uholdbart (f.eks. "fettforbrenning over natten", "renser giftstoffer/detox")
     * FARLIG: Potensielt helseskadelig, farlige doser eller oppfordrer til å droppe livsviktig medisin
   - Angi evidensnivå:
     * 'Høy (flere RCT/systematiske oversikter)'
     * 'Moderat/begrenset'
     * 'Kun dyre-/in vitro-studier'
     * 'Ingen påvist effekt'
     * 'Motbevist'
   - Skriv en "doctorSummary" (Dr. Mike's Reality Check) på 2-4 setninger som forklarer den fysiologiske virkeligheten på en folkelig måte.
   - Dersom reklamen inneholder farlige/ulovlige medisinske påstander eller kvakksalveri, skal dette også redusere seriøsitetsscoren kraftig (severity: 'danger').
   - HVIS SAKEN IKKE INNEHOLDER NOEN HELSEPÅSTANDER (f.eks. pakkesvindel fra Posten, bank-SMS, ordinær klesbutikk, elektronikk):
     Sett "medicalReview": { "hasMedicalClaims": false, "doctorSummary": "", "overallVerdict": "", "claims": [], "disclaimer": "" }.

Inndata:
- Brukerforespørsel: ${JSON.stringify(query || 'Bildeanalyse')}
- Visjonsanalyse fra bilde: ${JSON.stringify(vision || null)}
- Data fra Brønnøysundregistrene (Enhetsregisteret): ${JSON.stringify(brreg || null)}
- Domene- og nettadressevalidering: ${JSON.stringify(domain || null)}
- Omdømme- og varslingssjekk: ${JSON.stringify(reputation || null)}
- Kundeanmeldelser og omdømme (Google Reviews og Trustpilot): ${JSON.stringify(reviews || null)}
- Eventuelt separat produkt oppdaget på siden: ${JSON.stringify(detectedProduct || null)}

Kritisk regel for nettbutikker og nettsider:
- Hvis bildet eller inndataene har en oppdaget nettadresse eller et domene (f.eks. «sinful.no», «power.no», «elkjop.no», «zalando.no»): Subjektet for analysen og seriøsitetsscoren er ALLTID forhandleren/nettbutikken bak domenet (f.eks. «Sinful», «Power», «Elkjøp»), fordi det er denne aktøren forbrukeren handler hos og betaler penger til.
- Et eventuelt produkt eller varemerke som vises for salg på siden (f.eks. «Hims», «Nike», «Apple iPhone», «Oral-B») er KUN et produkt på siden og skal ALDRI settes som "name" for bedriften/subjektet. Sett i så fall produktet i "detectedProduct".

Generer en seriøsitetsscore fra 0 til 100:
- 0–39: HØY RISIKO (RØD). Typisk: Falsk merkevare, kjent svindelmønster, konkursrammet foretak, helsefarlige påstander/kvakksalveri, mistenkelig domene, ingen reell bedrift bak, eller ekstremt dårlige anmeldelser/kundeklager.
- 40–69: MODERAT RISIKO / VÆR OPPMERKSOM (GUL). Typisk: Nystiftet foretak, manglende MVA, villedende/udokumenterte helseløfter, ufullstendig kontaktinfo, uklare vilkår, eller under middels/blandede kundeanmeldelser.
- 70–100: LAV RISIKO / ETABLERT (GRØNN). Typisk: Etablert norsk AS eller NUF med historikk, aktivt MVA-registrert, offisielt domene, gode kundeanmeldelser, og eventuelle helsepåstander er i tråd med vitenskapelig konsensus.

Viktig om kundeanmeldelser:
- Hvis aktøren har lave anmeldelser på Google (< 3.0 stjerner) eller klager på manglende levering/kundeservice: Inkluder en risikofaktor med severity "danger" eller "warning" og reduser scoren.
- Hvis aktøren har gode verifiserte anmeldelser (>= 4.0 stjerner med et solid antall omtaler): Inkluder en trygghetsfaktor med severity "info".
- Rene nettbutikker uten fysiske utsalgssteder har sjelden Google Maps-anmeldelser; dette er helt normalt for netthandel og skal ikke trekke ned scoren dersom foretaket er etablert og registrert i Brønnøysund.

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
    "name": "Navn på butikk/forhandler (f.eks. Sinful)",
    "legalName": "Juridisk navn (f.eks. SINFUL APS)",
    "tradeName": "Markedsnavn hvis relevant",
    "relationship": "Tilknytning hvis relevant",
    "orgNumber": "9-sifret orgnr hvis relevant",
    "websiteUrl": "Nettadresse hvis relevant",
    "detectedProduct": "Navn på enkeltprodukt på siden hvis relevant (f.eks. Hims)"
  },
  "medicalReview": {
    "hasMedicalClaims": boolean,
    "doctorSummary": "Dr. Mike-stil pedagogisk og vitenskapelig reality check",
    "overallVerdict": "Kort overordnet medisinsk dom (f.eks. 'Udokumentert kosttilskudd med overdrevne løfter')",
    "claims": [
      {
        "claim": "Konkret påstand fra reklamen",
        "verdict": "DOKUMENTERT" | "DELVIS_DOKUMENTERT" | "UDOKUMENTERT" | "VILLEDENDE" | "MYTE" | "FARLIG",
        "scientificExplanation": "Vitenskapelig og fysiologisk forklaring basert på forskning",
        "evidenceLevel": "Høy (flere RCT/systematiske oversikter)" | "Moderat/begrenset" | "Kun dyre-/in vitro-studier" | "Ingen påvist effekt" | "Motbevist",
        "sourcesOrConsensus": ["EFSA", "Cochrane", "PubMed", "Helsedirektoratet", "DMP"]
      }
    ],
    "disclaimer": "Denne medisinske faktasjekken er basert på tilgjengelig medisinsk forskning og konsensus per i dag, og er kun ment for generell folkeopplysning. Den erstatter aldri individuell medisinsk vurdering, diagnose eller behandling hos autorisert lege."
  }
}
`;

      const response = await model.generateContent(prompt);
      const data = JSON.parse(response.response.text());

      // Sikre at nettbutikk/domene ikke forveksles med produktnavn i identifiedSubject
      let finalName = data.identifiedSubject?.name || query || 'Ukjent aktør';
      let finalLegalName = data.identifiedSubject?.legalName || brreg?.entity?.navn;
      let finalTradeName = data.identifiedSubject?.tradeName || brreg?.brandLink?.brandName;
      let finalRelationship = data.identifiedSubject?.relationship || brreg?.brandLink?.relationship;
      let finalDetectedProduct = detectedProduct || data.identifiedSubject?.detectedProduct;

      if (brreg?.brandLink) {
        finalName = brreg.brandLink.brandName;
        finalTradeName = brreg.brandLink.brandName;
        finalLegalName = brreg.entity?.navn || brreg.brandLink.officialName;
        finalRelationship = brreg.brandLink.relationship;
      } else if (brreg?.entity?.navn) {
        finalLegalName = brreg.entity.navn;
        if (domain?.domain) {
          const domainStem = domain.domain.replace(/^www\./i, '').split('.')[0];
          if (finalName.toLowerCase() !== domainStem.toLowerCase() && !finalName.toLowerCase().includes(domainStem.toLowerCase())) {
            finalDetectedProduct = finalDetectedProduct || finalName;
            finalName = domainStem.charAt(0).toUpperCase() + domainStem.slice(1);
          }
        }
      } else if (domain?.domain) {
        const domainStem = domain.domain.replace(/^www\./i, '').split('.')[0];
        if (finalName.toLowerCase() !== domainStem.toLowerCase() && !finalName.toLowerCase().includes(domainStem.toLowerCase())) {
          finalDetectedProduct = finalDetectedProduct || finalName;
          finalName = domainStem.charAt(0).toUpperCase() + domainStem.slice(1);
        }
      }

      let medicalReview: MedicalExpertReview | undefined = undefined;
      if (data.medicalReview && data.medicalReview.hasMedicalClaims) {
        medicalReview = {
          hasMedicalClaims: true,
          doctorSummary: data.medicalReview.doctorSummary || '',
          overallVerdict: data.medicalReview.overallVerdict || 'Helsepåstander gransket',
          claims: Array.isArray(data.medicalReview.claims)
            ? data.medicalReview.claims.map((c: any) => ({
                claim: String(c.claim || ''),
                verdict: c.verdict || 'UDOKUMENTERT',
                scientificExplanation: String(c.scientificExplanation || ''),
                evidenceLevel: c.evidenceLevel || 'Ingen påvist effekt',
                sourcesOrConsensus: Array.isArray(c.sourcesOrConsensus) && c.sourcesOrConsensus.length > 0
                  ? c.sourcesOrConsensus.map(String)
                  : ['Vitenskapelig konsensus'],
              }))
            : [],
          disclaimer:
            data.medicalReview.disclaimer ||
            'Denne medisinske faktasjekken er basert på tilgjengelig medisinsk forskning og konsensus per i dag, og er kun ment for generell folkeopplysning. Den erstatter aldri individuell medisinsk vurdering, diagnose eller behandling hos autorisert lege.',
        };
      }

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
        identifiedSubject: {
          name: finalName,
          legalName: finalLegalName,
          tradeName: finalTradeName,
          relationship: finalRelationship,
          orgNumber: brreg?.entity?.organisasjonsnummer || data.identifiedSubject?.orgNumber,
          websiteUrl: domain?.domain || data.identifiedSubject?.websiteUrl,
          detectedProduct: finalDetectedProduct,
        },
        brreg,
        domain,
        vision,
        reputation,
        reviews,
        medicalReview,
      };
    } catch (err: any) {
      console.warn('Gemini synthesis failed, falling back to heuristic engine:', err.message);
      return this.calculateHeuristicScore(id, query, vision, brreg, domain, reputation, reviews, detectedProduct);
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
    reputation?: ReputationCheckResult,
    reviews?: ReviewsCheckResult,
    detectedProduct?: string
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

    // Kundeanmeldelser & Google Reviews
    if (reviews?.google?.found && reviews.google.rating !== undefined) {
      const rating = reviews.google.rating;
      const count = reviews.google.userRatingCount || 0;

      if (rating < 2.5 && count >= 5) {
        riskFactors.push({
          title: 'Kritisk lave kundeanmeldelser på Google',
          description: `Gjennomsnittlig vurdering er kun ${rating} av 5 stjerner basert på ${count} anmeldelser. Kunder rapporterer om betydelig misnøye eller problemer.`,
          severity: 'danger',
        });
        score -= 25;
      } else if (rating < 3.5 && count >= 5) {
        riskFactors.push({
          title: 'Under middels kundeanmeldelser på Google',
          description: `Vurdering er ${rating} av 5 stjerner basert på ${count} anmeldelser. En del kunder melder om utfordringer.`,
          severity: 'warning',
        });
        score -= 10;
      } else if (rating >= 4.0 && count >= 10) {
        positiveFactors.push({
          title: 'Gode kundeanmeldelser på Google',
          description: `Vurdering er ${rating} av 5 stjerner basert på ${count} verifiserte anmeldelser. Viser fornøyde kunder og etablert drift.`,
          severity: 'info',
        });
        score += 10;
      }
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

    const brandLink = brreg?.brandLink;
    let subjectName: string;
    let legalName: string | undefined = undefined;
    let tradeName: string | undefined = undefined;
    let relationship: string | undefined = undefined;
    let finalDetectedProduct: string | undefined = detectedProduct;

    const domainStem = domain?.domain ? domain.domain.replace(/^www\./i, '').split('.')[0] : '';
    const formattedDomainName = domainStem ? domainStem.charAt(0).toUpperCase() + domainStem.slice(1) : '';

    if (brandLink) {
      subjectName = brandLink.brandName;
      tradeName = brandLink.brandName;
      legalName = brreg?.entity?.navn || brandLink.officialName;
      relationship = brandLink.relationship;

      if (brreg?.entity) {
        positiveFactors.unshift({
          title: 'Verifisert kjedetilknytning i Brønnøysund',
          description: `«${brandLink.brandName}» er verifisert tilknyttet det offisielle foretaket ${brreg.entity.navn} (org.nr ${brreg.entity.organisasjonsnummer}) som ${brandLink.relationship.toLowerCase()}${brreg.entity.antallAnsatte ? `, med ${brreg.entity.antallAnsatte} registrerte ansatte i Norge` : ''}.`,
          severity: 'info',
        });
        executiveSummary = `Kjeden «${brandLink.brandName}» er verifisert mot Brønnøysundregistrene gjennom sitt ${brandLink.relationship.toLowerCase()}, ${brreg.entity.navn}. Foretaket er aktivt med gyldig MVA-registrering og etablert drift.`;
        score = Math.max(score, 95);
        trafficLight = 'GREEN';
        riskLevel = 'LAV';
        headline = 'Lav risiko: Verifisert kjede og foretak';
      }
    } else if (domainStem) {
      // Domenet definerer butikken/forhandleren
      subjectName = formattedDomainName;
      tradeName = formattedDomainName;
      legalName = brreg?.entity?.navn;
      if (brreg?.entity?.navn && brreg.found) {
        relationship = 'Offisielt registrert foretak for domenet';
      }
    } else if (brreg?.entity?.navn) {
      subjectName = brreg.entity.navn;
      legalName = brreg.entity.navn;
      tradeName = vision?.identifiedBrands?.[0] || query;
    } else {
      subjectName = vision?.identifiedBrands?.[0] || query || 'Ukjent aktør';
    }

    // Hvis det finnes et annet merkevarenavn i bildet enn butikken, er det et produkt på siden
    if (!finalDetectedProduct && domainStem && vision?.identifiedBrands) {
      const otherBrand = vision.identifiedBrands.find(
        (b) => b.toLowerCase().replace(/[^a-z0-9]/g, '') !== domainStem.toLowerCase()
      );
      if (otherBrand) {
        finalDetectedProduct = otherBrand;
      }
    }

    let medicalReview: MedicalExpertReview | undefined = undefined;
    if (vision?.detectedHealthClaims && vision.detectedHealthClaims.length > 0) {
      medicalReview = {
        hasMedicalClaims: true,
        doctorSummary: 'Reklamen inneholder helserelaterte påstander. Fysiologisk kreves det grundig klinisk dokumentasjon før man kan love helseeffekter av tilskudd eller produkter.',
        overallVerdict: 'Udokumenterte helsepåstander oppdaget',
        claims: vision.detectedHealthClaims.map((claim) => ({
          claim,
          verdict: 'UDOKUMENTERT',
          scientificExplanation: 'Påstanden mangler godkjent helsepåstand hos EFSA eller kliniske studier med signifikant effekt på mennesker.',
          evidenceLevel: 'Ingen påvist effekt',
          sourcesOrConsensus: ['EFSA', 'Helsedirektoratet', 'DMP'],
        })),
        disclaimer: 'Denne medisinske faktasjekken er basert på tilgjengelig medisinsk forskning og konsensus per i dag, og er kun ment for generell folkeopplysning. Den erstatter aldri individuell medisinsk vurdering, diagnose eller behandling hos autorisert lege.',
      };
    }

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
        legalName,
        tradeName,
        relationship,
        orgNumber: brreg?.entity?.organisasjonsnummer,
        websiteUrl: domain?.domain,
        detectedProduct: finalDetectedProduct,
      },
      brreg,
      domain,
      vision,
      reputation,
      reviews,
      medicalReview,
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
    const identifiedBrands: string[] = [];

    // Norske og vanlige UI-ord, navigasjon, preposisjoner, emballasje- og matvareord som ALDRI skal tolkes som firmanavn
    const STOPWORDS = new Set([
      // Navigasjon og nettside-UI
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
      'din', 'ditt', 'dine', 'min', 'mitt', 'mine', 'og', 'eller', 'men', 'som', 'at',
      // Nettleserfaner (Chrome/Safari)
      'google', 'google chrome', 'chrome', 'safari', 'edge', 'microsoft edge',
      'firefox', 'opera', 'brave', 'ny fane', 'new tab', 'fane', 'faner', 'tab', 'tabs',
      'innboks', 'inbox', 'bokmerker', 'bookmarks', 'tillegg', 'extensions',
      'nedlastinger', 'downloads', 'historikk', 'history', 'søk på google',
      // Emballasje, matvarer og produksjon (forhindrer at ord på melkekartonger tolkes som firma)
      'melkesjokolade', 'sjokolade', 'lettmelk', 'helmelk', 'skummet', 'fløte',
      'yoghurt', 'smør', 'ost', 'rømme', 'kjølevare', 'best før', 'siste forbruksdag',
      'ingredienser', 'næringsinnhold', 'energi', 'fett', 'karbohydrater', 'sukkerarter',
      'sukker', 'protein', 'salt', 'pasteurisert', 'homogenisert', 'nettoinnhold',
      'volum', 'liter', 'dl', 'cl', 'ml', 'gram', 'kg', 'returkartong', 'pant',
      'kildesortering', 'resirkulering', 'oppbevares', 'åpnet', 'uåpnet', 'holdbarhet',
      'parti', 'batch', 'testet', 'stesta', 'testa', 'smak', 'oppskrift', 'god',
      'smaker', 'fersk', 'ekte', 'norsk', 'premium', 'original', 'nyhet', 'kvalitet'
    ]);

    const isStopword = (word: string): boolean => {
      const clean = word.toLowerCase().replace(/[^a-zæøå0-9]/g, '').trim();
      return STOPWORDS.has(clean) || STOPWORDS.has(word.toLowerCase().trim());
    };

    // 1. Logoer fra Cloud Vision API (høyeste visuelle pålitelighet)
    for (const logo of detectedLogos) {
      if (!isStopword(logo) && !identifiedBrands.includes(logo)) {
        identifiedBrands.push(logo);
      }
    }

    // 2. Formelle firmanavn i teksten med selskapsform (f.eks. "TINE SA", "KICKS NORGE AS", "KOMPLETT ASA")
    const corpRegex = /\b([A-ZÆØÅ][a-zA-ZæøåÆØÅ0-9\s&]{2,30}?)\s+(AS|ASA|SA|BA|DA|ANS|ENK|NUF)\b/g;
    let corpMatch;
    while ((corpMatch = corpRegex.exec(cleanText)) !== null) {
      const rawBase = corpMatch[1].trim();
      // Fjern ledetekster som "Produsert av", "Levert av" osv.
      const cleanBase = rawBase.replace(/^(Produsert|Levert|Distribuert|Importert|Kjøpt)\s+av\s+/i, '').trim();
      if (cleanBase.length >= 2 && !isStopword(cleanBase)) {
        if (!identifiedBrands.some(b => b.toLowerCase() === cleanBase.toLowerCase())) {
          identifiedBrands.push(cleanBase);
        }
      }
    }

    // 3. Tekst strippet for nettadresser og URL-parametere (forhindrer at utm_campaign=VG eller utm_source=facebook matcher som merkevare)
    const textWithoutUrls = cleanText.replace(/(?:https?:\/\/)?(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(?:\/[^\s]*)?/gi, ' ');

    // 4. CamelCase / PascalCase merkevaregjenkjenning (f.eks. "GetInspired" -> "Get Inspired", "BliVakker", "PostNord")
    const camelMatches = textWithoutUrls.match(/\b([A-Z][a-z0-9]+[A-Z][a-zA-Z0-9]*)\b/g) || [];
    for (const cm of camelMatches) {
      if (!isStopword(cm) && cm.length >= 4 && cm.length <= 25) {
        if (!identifiedBrands.some((b) => b.toLowerCase() === cm.toLowerCase())) {
          identifiedBrands.push(cm);
        }
        const split = cm.replace(/([a-z0-9])([A-Z])/g, '$1 $2').trim();
        if (split !== cm && !identifiedBrands.some((b) => b.toLowerCase() === split.toLowerCase())) {
          identifiedBrands.push(split);
        }
      }
    }

    // 5. Omfattende ordbok med etablerte norske og internasjonale merkevarer
    const knownBrands = [
      // Norske næringsmidler, meieri og forbruksvarer
      'Tine', 'Gilde', 'Prior', 'Nidar', 'Freia', 'Orkla', 'Ringnes', 'Bama',
      'Stabburet', 'Maarud', 'Sørlandschips', 'Diplom-Is', 'Hennig-Olsen',
      'Q-Meieriene', 'Kavli', 'Mills', 'Nortura', 'Synnøve Finden', 'Lofoten',
      'Grandiosa', 'Fjordland', 'Lerum', 'Idun', 'Bremykt', 'Jarlsberg', 'Norvegia',
      // Butikker, faghandel og nettbutikker
      'Get Inspired', 'GetInspired', 'Kicks', 'Elkjøp', 'Power', 'Komplett', 'Zalando', 'Boozt', 'Jula', 'Biltema',
      'Clas Ohlson', 'XXL', 'Sport 1', 'Fjellsport', 'Farmasiet', 'Apotek 1',
      'Vitusapotek', 'Boots Apotek', 'Outland', 'Norli', 'Ark', 'Lyko', 'Normal',
      'Europris', 'Kid Interiør', 'Princess', 'Ikea', 'Bohus', 'Skeidar',
      'Jysk', 'Coop', 'Rema 1000', 'Meny', 'Kiwi', 'Eurospar', 'Joker', 'Bunnpris',
      'Sparkjøp', 'Spar Kjøp', 'Sinful', 'Blivakker', 'Bli Vakker', 'Milrab', 'Gymgrossisten',
      // Telekom, Bank, Forsikring & Offentlig
      'Vipps', 'DNB', 'SpareBank 1', 'Nordea', 'Storebrand', 'Gjensidige', 'Posten',
      'PostNord', 'Telenor', 'Telia', 'Ice', 'Finn.no', 'Schibsted', 'Skatteetaten',
      'Politiet', 'Helsenorge', 'NAV', 'NRK', 'Dagbladet', 'TV 2',
      'Norwegian', 'SAS', 'Widerøe', 'Vy'
    ];

    for (const brand of knownBrands) {
      const regex = new RegExp(`\\b${brand}\\b`, 'i');
      if (regex.test(textWithoutUrls) && !identifiedBrands.some(b => b.toLowerCase() === brand.toLowerCase())) {
        identifiedBrands.push(brand);
      }
    }

    // 6. Spesifikk merkevaregjenkjenning foran "Club", "Klubb", "Store", "Shop"
    const clubMatch = textWithoutUrls.match(/([A-ZÆØÅ][a-zA-ZæøåÆØÅ0-9]{2,})\s+(Club|Klubb|Retail|Store|Shop|Nettbutikk)/);
    if (clubMatch) {
      const brand = clubMatch[1];
      if (!isStopword(brand) && !identifiedBrands.some(b => b.toLowerCase() === brand.toLowerCase())) {
        identifiedBrands.push(brand);
      }
    }

    // 5. Faresignaler i teksten
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

    const isConsumerProduct =
      lowerText.includes('næringsinnhold') ||
      lowerText.includes('ingredienser') ||
      lowerText.includes('best før') ||
      lowerText.includes('kjølevare') ||
      lowerText.includes('pasteurisert');

    let summaryOfContent = '';
    if (isConsumerProduct && identifiedBrands.length > 0) {
      summaryOfContent = `Gjenkjent som et ordinært norsk forbrukerprodukt fra ${identifiedBrands[0]}.`;
    } else if (cleanText.length > 0) {
      summaryOfContent = cleanText.length > 120 
        ? `${cleanText.slice(0, 120)}...` 
        : cleanText;
    } else {
      summaryOfContent = 'Ingen lesbar tekst eller kjente merkevarer ble oppdaget i bildet.';
    }

    // Helsepåstander / mirakelpåstander
    const detectedHealthClaims: string[] = [];
    const healthPatterns = [
      /(?:forbrenner|reduserer|smelter)\s+(?:fett|vekt|magefett)/i,
      /(?:kurerer|helbreder|fjerner)\s+(?:smerter|leddsmerter|artrose|betennelse|kreft|diabetes)/i,
      /(?:renser kroppen for giftstoffer|detox)/i,
      /(?:anti[-\s]?aging|reverserer aldring|fjerner rynker)/i,
      /(?:doktor|lege|ekspert)\s*(?:anbefalt|avslører|hemmelighet)/i,
      /(?:garantert|klinisk påvist)\s+(?:vekttap|resultat)/i,
      /(?:senker|normaliserer)\s+(?:blodtrykk|blodsukker)/i,
    ];
    for (const pattern of healthPatterns) {
      const m = cleanText.match(pattern);
      if (m && !detectedHealthClaims.includes(m[0])) {
        detectedHealthClaims.push(m[0]);
      }
    }

    return {
      extractedText: cleanText,
      identifiedBrands,
      detectedUrls,
      detectedOrgNumbers,
      visualRedFlags,
      summaryOfContent,
      hasSuspiciousVisualDesign: visualRedFlags.length > 0,
      detectedHealthClaims: detectedHealthClaims.length > 0 ? detectedHealthClaims : undefined,
    };
  }
}

