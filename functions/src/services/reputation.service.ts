import { ReputationCheckResult } from '../types/analysis.types';

// Eksempler på kjente mønstre og lister samlet fra Forbrukertilsynet, Varslingslisten og Økokrim
const KNOWN_SCAM_KEYWORDS = [
  'kjendis-avslører',
  'tjente millioner over natten',
  'skavlan',
  'dagsrevyen sensurert',
  'oljefondet hemmelighet',
  'quantum ai',
  'immediate connect',
  'immediate edge',
  'krypto bot',
  'bitcoin revolution',
  'ubegrenset avkastning',
  'invester 2500',
  'forbrukeradvarsel',
  'abonnementsfelle',
];

const HIGH_RISK_SHOP_PATTERNS = [
  'billige-merkevarer',
  'superrabatt',
  'outlet-norge',
  'salg-norge',
  'rabatt-oslo',
];

export class ReputationService {
  public async checkReputation(query: string, rawText?: string): Promise<ReputationCheckResult> {
    const combined = `${query} ${rawText || ''}`.toLowerCase();
    const notes: string[] = [];
    const warningSources: string[] = [];
    let isKnownScam = false;

    // Sjekk mot kjente investeringssvindler og falske kjendisartikler
    for (const kw of KNOWN_SCAM_KEYWORDS) {
      if (combined.includes(kw)) {
        isKnownScam = true;
        warningSources.push('Forbrukertilsynet / Finanstilsynet advarsler');
        notes.push(`Matchet velkjent svindelmønster rapportert av tilsynsmyndigheter: «${kw}»`);
        break;
      }
    }

    // Sjekk mot typiske falske nettbutikk-navnemønstre
    for (const pattern of HIGH_RISK_SHOP_PATTERNS) {
      if (combined.includes(pattern)) {
        warningSources.push('Varslingslisten (Nettbutikk-mønster)');
        notes.push(`Navnet inneholder typiske kjennetegn for uregistrerte kopinettbutikker («${pattern}»)`);
        break;
      }
    }

    return {
      isKnownScam,
      consumerWarningFound: warningSources.length > 0,
      warningSources,
      notes,
    };
  }
}
