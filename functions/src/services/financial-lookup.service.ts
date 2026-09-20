import axios from 'axios';
import { FinancialSubstance } from '../types/trust-report.types';
import { EvidenceObject } from '../types/evidence.types';

const REGNSKAP_BASE_URL = 'https://data.brreg.no/regnskapsregisteret/regnskap';

export class FinancialLookupService {
  /**
   * Henter offisielle årsregnskap fra Regnskapsregisteret i Brønnøysund for norske aksjeselskaper.
   */
  public async lookupFinancials(
    orgNumber?: string,
    employeeCount?: number
  ): Promise<{ financials: FinancialSubstance; evidence: EvidenceObject[] }> {
    const evidence: EvidenceObject[] = [];
    const now = new Date().toISOString();

    if (!orgNumber || !/^\d{9}$/.test(orgNumber)) {
      return {
        financials: {
          status: 'INGEN_DATA',
          summary: 'Ingen offentlige regnskapstall tilgjengelig (utenlandsk foretak eller uregistrert organisasjonsnummer).',
          employeeCount,
          accountingNotes: ['Foretaket har ikke levert årsregnskap til det norske Regnskapsregisteret.'],
        },
        evidence: [
          {
            id: 'ev-fin-none',
            category: 'FINANCIAL',
            claim: 'Offentlig regnskapshistorikk',
            finding: 'Ingen regnskaper funnet i det norske Regnskapsregisteret.',
            verdict: 'IKKE_VERIFISERT',
            sourceName: 'Regnskapsregisteret',
            sourceType: 'OFFISIELT_REGISTER',
            retrievedAt: now,
            confidence: 'LOW',
          },
        ],
      };
    }

    try {
      const response = await axios.get(`${REGNSKAP_BASE_URL}/${orgNumber}`, {
        timeout: 5000,
        headers: { Accept: 'application/json' },
      });

      const accounts = Array.isArray(response.data) ? response.data : [response.data];
      if (accounts.length === 0) {
        return this.buildNoAccountsResult(orgNumber, employeeCount, evidence, now);
      }

      // Siste regnskapsår (nyeste først)
      const latest = accounts[0];
      const year = latest.regnskapsperiode?.tilDato?.split('-')[0] || 'Siste år';
      
      const income = latest.resultatregnskapResultat?.driftsresultat?.driftsinntekter?.sumDriftsinntekter;
      const operatingResult = latest.resultatregnskapResultat?.driftsresultat?.driftsresultat;
      const netProfit = latest.resultatregnskapResultat?.aarsresultat;
      const equity = latest.egenkapitalGjeld?.egenkapital?.sumEgenkapital;
      const debt = latest.egenkapitalGjeld?.gjeldOversikt?.sumGjeld;

      const formatNok = (num?: number): string => {
        if (num === undefined || num === null) return 'Ikke oppgitt';
        const mill = (num / 1000000).toFixed(1);
        if (Math.abs(num) >= 1000000) {
          return `${mill} MNOK`;
        }
        return `${(num / 1000).toFixed(0)} KNOK`;
      };

      const notes: string[] = [
        `Offisielt regnskap for ${year} er levert og registrert hos Brønnøysundregistrene.`,
      ];

      if (equity !== undefined && equity < 0) {
        notes.push('Obs: Foretaket rapporterte negativ egenkapital i siste regnskapsår.');
      } else if (equity !== undefined && equity > 500000) {
        notes.push('Foretaket har solid registrert egenkapital.');
      }

      if (operatingResult !== undefined && operatingResult > 0) {
        notes.push('Driften viser positivt driftsresultat.');
      }

      const isSubstantial = (income && income > 1000000) || (equity && equity > 500000);
      const status: FinancialSubstance['status'] = (equity !== undefined && equity < 0)
        ? 'RISIKO'
        : isSubstantial
        ? 'VERIFISERT'
        : 'BEGRENSET';

      const summary = status === 'VERIFISERT'
        ? `Virksomheten har levert godkjente offentlige regnskaper og viser et dokumentert, aktivt økonomisk fotavtrykk (omsetning: ${formatNok(income)}, egenkapital: ${formatNok(equity)}).`
        : status === 'RISIKO'
        ? `Foretaket har levert regnskap for ${year}, men viser negativ egenkapital (${formatNok(equity)}) som tilsier økonomisk sårbarhet.`
        : `Foretaket har levert offentlig regnskap for ${year} med begrenset økonomisk aktivitet (${formatNok(income)}).`;

      evidence.push({
        id: `ev-fin-brreg-${orgNumber}`,
        category: 'FINANCIAL',
        claim: 'Økonomisk aktivitet og regnskap',
        finding: summary,
        verdict: status === 'RISIKO' ? 'ADVARSEL' : 'VERIFISERT_FAKTA',
        sourceName: 'Regnskapsregisteret i Brønnøysund',
        sourceUrl: `https://virksomhet.brreg.no/nb/oppslag/enheter/${orgNumber}`,
        sourceType: 'OFFISIELT_REGISTER',
        retrievedAt: now,
        confidence: 'HIGH',
        supportingSnippet: `Driftsinntekter: ${formatNok(income)}, Driftsresultat: ${formatNok(operatingResult)}, Årsresultat: ${formatNok(netProfit)}, Egenkapital: ${formatNok(equity)}, Gjeld: ${formatNok(debt)}. Regnskapsperiode: ${year}.`,
      });

      return {
        financials: {
          status,
          summary,
          revenueOrTurnover: income !== undefined ? formatNok(income) : undefined,
          operatingResult: operatingResult !== undefined ? formatNok(operatingResult) : undefined,
          equity: equity !== undefined ? formatNok(equity) : undefined,
          employeeCount,
          filingYearsCount: accounts.length,
          accountingNotes: notes,
        },
        evidence,
      };
    } catch (err: any) {
      return this.buildNoAccountsResult(orgNumber, employeeCount, evidence, now);
    }
  }

  private buildNoAccountsResult(
    orgNumber: string,
    employeeCount: number | undefined,
    evidence: EvidenceObject[],
    now: string
  ): { financials: FinancialSubstance; evidence: EvidenceObject[] } {
    evidence.push({
      id: `ev-fin-not-filed-${orgNumber}`,
      category: 'FINANCIAL',
      claim: 'Innsendte årsregnskaper',
      finding: 'Ingen godkjente årsregnskaper er registrert hos Regnskapsregisteret for dette foretaket (kan være nystiftet, underlagt utenlandsk regnskapsplikt, eller NUF/ENK uten leveringsplikt).',
      verdict: 'IKKE_VERIFISERT',
      sourceName: 'Regnskapsregisteret',
      sourceType: 'OFFISIELT_REGISTER',
      retrievedAt: now,
      confidence: 'MODERATE',
    });

    return {
      financials: {
        status: 'BEGRENSET',
        summary: 'Ingen årsregnskaper registrert i det norske Regnskapsregisteret. Dette er normalt for nystiftede selskaper, enkeltpersonforetak eller utenlandske foretak (NUF).',
        employeeCount,
        accountingNotes: ['Ingen offentlige regnskapstall tilgjengelig i Brønnøysund.'],
      },
      evidence,
    };
  }
}
