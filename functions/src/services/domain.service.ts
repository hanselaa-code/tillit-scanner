import * as dns from 'dns';
import { DomainCheckResult } from '../types/analysis.types';

const SUSPICIOUS_TLDS = [
  'top', 'xyz', 'click', 'buzz', 'rest', 'work', 'icu', 'vip', 
  'cfd', 'sbs', 'quest', 'bar', 'mom', 'beauty', 'surf'
];

const SPOOFED_TARGET_KEYWORDS = [
  'dnb', 'vipps', 'posten', 'nordea', 'skatt', 'politiet', 
  'sparebank', 'storebrand', 'klarna', 'telenor', 'elkjop', 'power'
];

export class DomainService {
  public extractDomain(input: string): string | null {
    if (!input) return null;

    let target = input.trim();
    if (!/^https?:\/\//i.test(target)) {
      target = 'https://' + target;
    }

    try {
      const parsed = new URL(target);
      return parsed.hostname.toLowerCase();
    } catch {
      // Fallback regex if URL parsing fails
      const match = input.match(/([a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\.[a-zA-Z]{2,})?)/);
      return match ? match[1].toLowerCase() : null;
    }
  }

  public async analyzeDomain(rawUrlOrDomain: string): Promise<DomainCheckResult> {
    const domain = this.extractDomain(rawUrlOrDomain);
    const isHttps = /^https:\/\//i.test(rawUrlOrDomain.trim()) || !rawUrlOrDomain.startsWith('http://');

    if (!domain) {
      return {
        domain: rawUrlOrDomain,
        isHttps,
        isSuspiciousTld: false,
        dnsResolved: false,
        flags: ['Ugyldig eller ufullstendig nettadresse'],
      };
    }

    const flags: string[] = [];
    const parts = domain.split('.');
    const tld = parts[parts.length - 1];

    const isSuspiciousTld = SUSPICIOUS_TLDS.includes(tld);
    if (isSuspiciousTld) {
      flags.push(`Nettadressen benytter et toppdomene (.${tld}) som har høy statistisk overvekt i svindel- og phishing-kampanjer`);
    }

    // Typosquatting / merkevare-etterligning
    for (const kw of SPOOFED_TARGET_KEYWORDS) {
      if (domain.includes(kw) && !domain.endsWith(`${kw}.no`) && !domain.endsWith(`${kw}.com`)) {
        flags.push(`Mulig merkevare-etterligning: Domene inneholder «${kw}», men er ikke det offisielle domenet til merkevaren`);
        break;
      }
    }

    // Flere bindestreker er vanlig i phishing (f.eks. login-vipps-sikkerhet-refusjon)
    const hyphenCount = (domain.match(/-/g) || []).length;
    if (hyphenCount >= 3) {
      flags.push('Domenenavnet har uvanlig mange bindestreker (ofte brukt for å omgå sikkerhetsfiltre)');
    }

    // Sjekk om domenet resolver i DNS
    let dnsResolved = false;
    try {
      await dns.promises.lookup(domain);
      dnsResolved = true;
    } catch {
      dnsResolved = false;
      flags.push('Domenet svarer ikke på DNS-oppslag (kan være nylig stengt eller ugyldig)');
    }

    if (!isHttps) {
      flags.push('Nettsiden mangler sikker HTTPS-kryptering');
    }

    return {
      domain,
      isHttps,
      isSuspiciousTld,
      dnsResolved,
      flags,
    };
  }
}
