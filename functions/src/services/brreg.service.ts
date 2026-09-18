import axios from 'axios';
import { BrregCheckResult, BrregEntity, BrandToEntityLink } from '../types/analysis.types';
import { BrandMappingService } from './brand-mapping.service';

const BRREG_BASE_URL = 'https://data.brreg.no/enhetsregisteret/api/enheter';

export class BrregService {
  /**
   * Sjekker enhet mot Brønnøysundregistrene basert på 9-sifret orgnr,
   * kjente butikkjeder/varemerker eller firmanavn.
   */
  public async lookup(query: string, domainCandidate?: string): Promise<BrregCheckResult> {
    const cleaned = query.trim();
    if (!cleaned) {
      return {
        found: false,
        warningFlags: [],
        isDissolvedOrBankrupt: false,
        isRegisteredInMva: false,
      };
    }

    // 1. Sjekk om søket er et 9-sifret organisasjonsnummer
    const orgNrMatch = cleaned.replace(/\s+/g, '').match(/^\d{9}$/);
    if (orgNrMatch) {
      return this.lookupByOrgNr(orgNrMatch[0]);
    }

    // 2. Kjedetilknytning: Sjekk om søket eller domenet matcher en kjent kjede/merkevare
    // (f.eks. Normal -> NORMAL NORGE AS, 7-Eleven -> REITAN CONVENIENCE NORWAY AS, Montér -> OPTIMERA AS)
    const brandMapping =
      BrandMappingService.findMapping(cleaned) ||
      (domainCandidate ? BrandMappingService.findByDomain(domainCandidate) : undefined);

    if (brandMapping) {
      const link: BrandToEntityLink = {
        brandName: brandMapping.brandName,
        officialName: brandMapping.officialName,
        relationship: brandMapping.relationship,
        primaryOrgNr: brandMapping.primaryOrgNr,
      };

      const result = await this.lookupByOrgNr(brandMapping.primaryOrgNr, link);
      if (result.found) {
        result.searchedQuery = cleaned;
        return result;
      }
    }

    // 3. Søk på navn med parallell selskapsform-utvidelse
    return this.searchByName(cleaned);
  }

  public async lookupByOrgNr(orgNr: string, brandLink?: BrandToEntityLink): Promise<BrregCheckResult> {
    try {
      const response = await axios.get<BrregEntity>(`${BRREG_BASE_URL}/${orgNr}`, {
        timeout: 6000,
        headers: { Accept: 'application/json' },
      });

      return this.processEntity(response.data, orgNr, brandLink);
    } catch (error: any) {
      if (error.response && error.response.status === 404) {
        return {
          searchedQuery: orgNr,
          found: false,
          warningFlags: [`Organisasjonsnummer ${orgNr} finnes ikke i Enhetsregisteret`],
          isDissolvedOrBankrupt: false,
          isRegisteredInMva: false,
          brandLink,
        };
      }
      console.warn(`Brreg lookup failed for ${orgNr}:`, error.message);
      return {
        searchedQuery: orgNr,
        found: false,
        warningFlags: ['Kunne ikke kontakte Brønnøysundregistrene i sanntid'],
        isDissolvedOrBankrupt: false,
        isRegisteredInMva: false,
        brandLink,
      };
    }
  }

  public async searchByName(name: string): Promise<BrregCheckResult> {
    try {
      const cleanQ = name.trim().toUpperCase();
      const queries = [name.trim()];

      // Hvis søket ikke allerede har en selskapsform, søk også spesifikt etter vanlige former, driftsselskaper og "Norge"
      if (!cleanQ.includes(' AS') && !cleanQ.includes(' SA') && !cleanQ.includes(' ASA')) {
        queries.push(
          `${name.trim()} NORGE AS`,
          `${name.trim()} AS`,
          `${name.trim()} SA`,
          `${name.trim()} NORGE`,
          `${name.trim()} DRIFT AS`,
          `${name.trim()} BUTIKKDRIFT AS`,
          `${name.trim()} RETAIL AS`
        );
      }

      // Kjør oppslag i parallell
      const requests = queries.map((q) =>
        axios
          .get<{ _embedded?: { enheter?: BrregEntity[] } }>(
            `${BRREG_BASE_URL}?navn=${encodeURIComponent(q)}&size=10`,
            {
              timeout: 6000,
              headers: { Accept: 'application/json' },
            }
          )
          .catch(() => null)
      );

      const responses = await Promise.all(requests);
      const allEnheter: BrregEntity[] = [];
      const seenOrgNrs = new Set<string>();

      for (const res of responses) {
        const enheter = res?.data?._embedded?.enheter || [];
        for (const e of enheter) {
          if (e.organisasjonsnummer && !seenOrgNrs.has(e.organisasjonsnummer)) {
            seenOrgNrs.add(e.organisasjonsnummer);
            allEnheter.push(e);
          }
        }
      }

      if (allEnheter.length === 0) {
        return {
          searchedQuery: name,
          found: false,
          warningFlags: [`Ingen registrerte foretak funnet i Brønnøysundregistrene for «${name}»`],
          isDissolvedOrBankrupt: false,
          isRegisteredInMva: false,
        };
      }

      // Rangér treffene for å finne det mest relevante selskapet (f.eks. TINE SA eller KICKS NORGE AS fremfor tilfeldig ENK)
      const scored = allEnheter.map((e) => {
        let score = 0;
        const eName = (e.navn || '').toUpperCase();
        const form = e.organisasjonsform?.kode || '';
        const employees = e.antallAnsatte || 0;

        if (eName === cleanQ) {
          score += 100;
        } else if (
          eName === `${cleanQ} AS` ||
          eName === `${cleanQ} SA` ||
          eName === `${cleanQ} ASA` ||
          eName === `${cleanQ} BA`
        ) {
          score += 95;
        } else if (
          eName === `${cleanQ} NORGE` ||
          eName === `${cleanQ} NORGE AS` ||
          eName === `${cleanQ} NORWAY AS`
        ) {
          score += 85;
        } else if (eName.startsWith(cleanQ + ' ')) {
          score += 50;
        } else if (eName.includes(cleanQ)) {
          score += 20;
        }

        // Foretaksform-scoring: aksjeselskap og samvirker veier tungt
        if (form === 'AS' || form === 'ASA' || form === 'SA' || form === 'BA') {
          score += 40;
        } else if (form === 'ENK') {
          // Enkeltpersonforetak er sjelden den etablerte produsenten eller nettbutikken
          score -= 30;
        }

        // Ansatte-scoring: store arbeidsgivere prioriteres fremfor tomme selskaper
        if (employees > 500) {
          score += 60;
        } else if (employees > 50) {
          score += 40;
        } else if (employees > 5) {
          score += 20;
        } else if (employees === 0 && form === 'ENK') {
          score -= 20;
        }

        if (e.konkurs) {
          score -= 100;
        }
        if (e.underAvvikling || e.underTvangsavviklingEllerTvangsopplosning) {
          score -= 80;
        }
        return { entity: e, score };
      });

      scored.sort((a, b) => b.score - a.score);
      const best = scored[0];

      // Sjekk om det faktisk er en reell navnelikhet, eller bare en tilfeldig fuzzy-match
      const bestName = (best.entity.navn || '').toUpperCase();
      const hasActualMatch =
        bestName === cleanQ ||
        bestName.startsWith(cleanQ + ' ') ||
        bestName.endsWith(' ' + cleanQ) ||
        bestName.includes(' ' + cleanQ + ' ') ||
        (cleanQ.length > 4 && bestName.includes(cleanQ));

      if (!hasActualMatch || best.score < 10) {
        return {
          searchedQuery: name,
          found: false,
          warningFlags: [`Ingen registrerte foretak i Brønnøysundregistrene matcher navnet «${name}»`],
          isDissolvedOrBankrupt: false,
          isRegisteredInMva: false,
        };
      }

      return this.processEntity(best.entity, name);
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

  private processEntity(
    entity: BrregEntity,
    query: string,
    brandLink?: BrandToEntityLink
  ): BrregCheckResult {
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
      brandLink,
    };
  }
}
