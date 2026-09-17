import axios from 'axios';
import { BrregCheckResult, BrregEntity } from '../types/analysis.types';

const BRREG_BASE_URL = 'https://data.brreg.no/enhetsregisteret/api/enheter';

export class BrregService {
  /**
   * Sjekker enhet mot Brønnøysundregistrene basert på enten 9-sifret orgnr eller firmanavn.
   */
  public async lookup(query: string): Promise<BrregCheckResult> {
    const cleaned = query.trim();
    if (!cleaned) {
      return {
        found: false,
        warningFlags: [],
        isDissolvedOrBankrupt: false,
        isRegisteredInMva: false,
      };
    }

    // Sjekk om søket er et 9-sifret organisasjonsnummer
    const orgNrMatch = cleaned.replace(/\s+/g, '').match(/^\d{9}$/);

    if (orgNrMatch) {
      return this.lookupByOrgNr(orgNrMatch[0]);
    }

    return this.searchByName(cleaned);
  }

  public async lookupByOrgNr(orgNr: string): Promise<BrregCheckResult> {
    try {
      const response = await axios.get<BrregEntity>(`${BRREG_BASE_URL}/${orgNr}`, {
        timeout: 6000,
        headers: { Accept: 'application/json' },
      });

      return this.processEntity(response.data, orgNr);
    } catch (error: any) {
      if (error.response && error.response.status === 404) {
        return {
          searchedQuery: orgNr,
          found: false,
          warningFlags: [`Organisasjonsnummer ${orgNr} finnes ikke i Enhetsregisteret`],
          isDissolvedOrBankrupt: false,
          isRegisteredInMva: false,
        };
      }
      console.warn(`Brreg lookup failed for ${orgNr}:`, error.message);
      return {
        searchedQuery: orgNr,
        found: false,
        warningFlags: ['Kunne ikke kontakte Brønnøysundregistrene i sanntid'],
        isDissolvedOrBankrupt: false,
        isRegisteredInMva: false,
      };
    }
  }

  public async searchByName(name: string): Promise<BrregCheckResult> {
    try {
      const response = await axios.get<{ _embedded?: { enheter?: BrregEntity[] } }>(
        `${BRREG_BASE_URL}?navn=${encodeURIComponent(name)}&size=3`,
        {
          timeout: 6000,
          headers: { Accept: 'application/json' },
        }
      );

      const enheter = response.data?._embedded?.enheter;
      if (!enheter || enheter.length === 0) {
        return {
          searchedQuery: name,
          found: false,
          warningFlags: [`Ingen registrerte foretak funnet i Brønnøysundregistrene for «${name}»`],
          isDissolvedOrBankrupt: false,
          isRegisteredInMva: false,
        };
      }

      // Velg det første og mest relevante treffet
      const bestMatch = enheter[0];
      return this.processEntity(bestMatch, name);
    } catch (error: any) {
      console.warn(`Brreg searchByName failed for ${name}:`, error.message);
      return {
        searchedQuery: name,
        found: false,
        warningFlags: ['Søk i Enhetsregisteret utilgjengelig akkurat nå'],
        isDissolvedOrBankrupt: false,
        isRegisteredInMva: false,
      };
    }
  }

  private processEntity(entity: BrregEntity, query: string): BrregCheckResult {
    const warningFlags: string[] = [];

    const isBankrupt = Boolean(entity.konkurs);
    const isLiquidating = Boolean(
      entity.underAvvikling || entity.underTvangsavviklingEllerTvangsopplosning
    );

    if (isBankrupt) {
      warningFlags.push('KRITISK: Foretaket er registrert som konkurs');
    }
    if (isLiquidating) {
      warningFlags.push('KRITISK: Foretaket er under avvikling eller tvangsoppløsning');
    }

    const regDate = entity.stiftelsesdato || entity.registreringsdatoEnhetsregisteret;
    let ageYears = 0;
    if (regDate) {
      const established = new Date(regDate);
      const diffMs = Date.now() - established.getTime();
      ageYears = Math.max(0, parseFloat((diffMs / (1000 * 60 * 60 * 24 * 365.25)).toFixed(1)));

      if (ageYears < 0.5) {
        warningFlags.push('Foretaket er nystiftet (mindre enn 6 måneder gammelt)');
      }
    }

    if (entity.registrertIMvaregisteret === false) {
      warningFlags.push('Foretaket er ikke registrert i Merverdiavgiftsregisteret');
    }

    return {
      searchedQuery: query,
      found: true,
      entity,
      warningFlags,
      isDissolvedOrBankrupt: isBankrupt || isLiquidating,
      isRegisteredInMva: Boolean(entity.registrertIMvaregisteret),
      ageYears,
    };
  }
}
