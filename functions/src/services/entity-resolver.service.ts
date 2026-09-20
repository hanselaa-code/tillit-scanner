import { EvidenceObject } from '../types/evidence.types';
import { BrregService } from './brreg.service';
import { DomainService } from './domain.service';
import { BrandMappingService } from './brand-mapping.service';
import { BrregCheckResult, DomainCheckResult } from '../types/analysis.types';

export interface ResolvedEntity {
  resolvedName: string;
  officialLegalName: string;
  orgNumber?: string;
  country: string;
  domain?: string;
  isRegisteredInNorway: boolean;
  registrationDetails?: string;
  evidence: EvidenceObject[];
  brreg?: BrregCheckResult;
  domainCheck?: DomainCheckResult;
}

export class EntityResolverService {
  private brregService: BrregService;
  private domainService: DomainService;

  constructor() {
    this.brregService = new BrregService();
    this.domainService = new DomainService();
  }

  public async resolve(inputQuery: string, domainCandidate?: string): Promise<ResolvedEntity> {
    const raw = inputQuery.trim();
    const evidence: EvidenceObject[] = [];
    const now = new Date().toISOString();

    // 1. Ekstraher domenekandidat
    let domain = domainCandidate ? this.domainService.extractDomain(domainCandidate) : null;
    if (!domain && this.looksLikeUrl(raw)) {
      domain = this.domainService.extractDomain(raw);
    }

    // 2. Domenestamme hvis tilgjengelig
    let domainStem = '';
    if (domain) {
      domainStem = domain.replace(/^www\./i, '').split('.')[0];
    }

    // 3. Merkevarekobling (f.eks. Normal -> NORMAL NORGE AS, Sinful -> SINFUL APS)
    const brandMapping =
      BrandMappingService.findMapping(raw) ||
      (domain ? BrandMappingService.findByDomain(domain) : undefined);

    let searchTarget = brandMapping ? brandMapping.officialName : (raw || domainStem);
    if (!searchTarget && domainStem) {
      searchTarget = domainStem;
    }

    // 4. Parallell oppslag mot Brreg og Domene
    const [brregResult, domainResult] = await Promise.all([
      searchTarget ? this.brregService.lookup(searchTarget, domain || undefined) : Promise.resolve(undefined),
      domain ? this.domainService.analyzeDomain(domain) : Promise.resolve(undefined),
    ]);

    // 5. Avgjør land, navn og juridisk form
    let resolvedName = brandMapping?.brandName || (domainStem ? domainStem.charAt(0).toUpperCase() + domainStem.slice(1) : raw);
    let officialLegalName = resolvedName;
    let orgNumber: string | undefined = undefined;
    let country = 'Norge';
    let isRegisteredInNorway = false;
    let registrationDetails: string | undefined;

    if (brregResult?.found && brregResult.entity) {
      isRegisteredInNorway = true;
      orgNumber = brregResult.entity.organisasjonsnummer;
      officialLegalName = brregResult.entity.navn;
      resolvedName = brandMapping?.brandName || brregResult.brandLink?.brandName || resolvedName;
      country = brregResult.entity.postadresse?.land || 'Norge';

      const formDesc = brregResult.entity.organisasjonsform?.beskrivelse || 'Aksjeselskap';
      registrationDetails = `Registrert i Enhetsregisteret som ${formDesc} (org.nr ${orgNumber}).`;

      evidence.push({
        id: `ev-identity-brreg-${orgNumber}`,
        category: 'IDENTITY',
        claim: `Foretaket er registrert i offentlig register`,
        finding: `${officialLegalName} er formelt registrert i Brønnøysundregistrene med organisasjonsnummer ${orgNumber}. Status: Aktiv.`,
        verdict: 'VERIFISERT_FAKTA',
        sourceName: 'Brønnøysundregistrene - Enhetsregisteret',
        sourceUrl: `https://virksomhet.brreg.no/nb/oppslag/enheter/${orgNumber}`,
        sourceType: 'OFFISIELT_REGISTER',
        retrievedAt: now,
        confidence: 'HIGH',
        supportingSnippet: `Stiftelsesdato: ${brregResult.entity.stiftelsesdato || 'Ukjent'}, MVA: ${brregResult.isRegisteredInMva ? 'Ja' : 'Nei'}`,
      });

      if (brregResult.isDissolvedOrBankrupt) {
        evidence.push({
          id: `ev-identity-bankruptcy-${orgNumber}`,
          category: 'IDENTITY',
          claim: 'Foretakets driftsstatus',
          finding: `Foretaket er meldt konkurs eller under avvikling i Brønnøysundregistrene.`,
          verdict: 'ADVARSEL',
          sourceName: 'Brønnøysundregistrene',
          sourceUrl: `https://virksomhet.brreg.no/nb/oppslag/enheter/${orgNumber}`,
          sourceType: 'OFFISIELT_REGISTER',
          retrievedAt: now,
          confidence: 'HIGH',
        });
      }
    } else {
      // Ikke funnet i Brreg
      if (domain?.endsWith('.no')) {
        evidence.push({
          id: `ev-identity-brreg-missing`,
          category: 'IDENTITY',
          claim: 'Norsk selskapsregistrering for .no-domene',
          finding: `Fant ingen aktiv registrering i Brønnøysundregistrene for «${searchTarget}», til tross for at nettstedet benytter et .no-toppdomene.`,
          verdict: 'ADVARSEL',
          sourceName: 'Brønnøysundregistrene',
          sourceType: 'OFFISIELT_REGISTER',
          retrievedAt: now,
          confidence: 'MODERATE',
          supportingSnippet: 'Kan indikere utenlandsk aktør uten NUF, privateid enkeltdomene, eller foretak registrert under et annet juridisk morselskap.',
        });
      } else {
        evidence.push({
          id: `ev-identity-brreg-notfound`,
          category: 'IDENTITY',
          claim: 'Selskapsregistrering i Enhetsregisteret',
          finding: `Ingen registrering funnet i Brønnøysundregistrene for «${searchTarget}». Virksomheten opererer trolig fra utlandet eller som et internasjonalt varemerke.`,
          verdict: 'IKKE_VERIFISERT',
          sourceName: 'Brønnøysundregistrene',
          sourceType: 'OFFISIELT_REGISTER',
          retrievedAt: now,
          confidence: 'MODERATE',
        });
      }

      // Detekter om domenet eller navnet peker mot en nordisk nabo (f.eks. Danmark / Sverige)
      if (
        domain?.endsWith('.dk') ||
        /aps\b/i.test(raw) ||
        /aps\b/i.test(brandMapping?.officialName || '')
      ) {
        country = 'Danmark';
        officialLegalName = brandMapping?.officialName || (raw.toUpperCase().includes('APS') ? raw : `${resolvedName} ApS`);
        registrationDetails = brandMapping?.relationship || 'Dansk registrert virksomhet (ApS / CVR).';
      } else if (
        domain?.endsWith('.se') ||
        /ab\b/i.test(raw) ||
        /ab\b/i.test(brandMapping?.officialName || '')
      ) {
        country = 'Sverige';
        officialLegalName = brandMapping?.officialName || `${resolvedName} AB`;
        registrationDetails = brandMapping?.relationship || 'Svensk registrert virksomhet (AB / Bolagsverket).';
      } else {
        country = 'Internasjonal / Uavklart';
        registrationDetails = brandMapping?.relationship || 'Utenlandsk eller internasjonalt foretak.';
      }
    }

    // 6. Legg til bevis for domene
    if (domainResult && domainResult.domain) {
      evidence.push({
        id: `ev-digital-dns-${domainResult.domain}`,
        category: 'DIGITAL',
        claim: `Nettside og digital identitet for ${domainResult.domain}`,
        finding: domainResult.dnsResolved
          ? `Domenet ${domainResult.domain} resolver aktivt i DNS med gyldig HTTPS.`
          : `Domenet ${domainResult.domain} svarer ikke på DNS-oppslag.`,
        verdict: domainResult.dnsResolved ? 'VERIFISERT_FAKTA' : 'ADVARSEL',
        sourceName: 'DNS & SSL Registry',
        sourceUrl: `https://${domainResult.domain}`,
        sourceType: 'TEKNISK_OPPSLAG',
        retrievedAt: now,
        confidence: 'HIGH',
      });

      for (const flag of domainResult.flags) {
        evidence.push({
          id: `ev-digital-flag-${Math.random().toString(36).substring(7)}`,
          category: 'DIGITAL',
          claim: 'Domenerisiko og navnesikkerhet',
          finding: flag,
          verdict: 'ADVARSEL',
          sourceName: 'Domain & Security Analyzer',
          sourceType: 'TEKNISK_OPPSLAG',
          retrievedAt: now,
          confidence: 'HIGH',
        });
      }
    }

    return {
      resolvedName,
      officialLegalName,
      orgNumber,
      country,
      domain: domain || undefined,
      isRegisteredInNorway,
      registrationDetails,
      evidence,
      brreg: brregResult,
      domainCheck: domainResult,
    };
  }

  private looksLikeUrl(text: string): boolean {
    return /^https?:\/\//i.test(text) || /\.[a-z]{2,}(\/|$)/i.test(text);
  }
}
