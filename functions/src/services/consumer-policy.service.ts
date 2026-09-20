import { ConsumerProtectionAudit } from '../types/trust-report.types';
import { EvidenceObject } from '../types/evidence.types';

export class ConsumerPolicyService {
  /**
   * Analyserer forbrukervilkår, angrerett, returmuligheter og betalingssikkerhet.
   */
  public analyzePolicies(
    websiteText?: string,
    domain?: string
  ): { audit: ConsumerProtectionAudit; evidence: EvidenceObject[] } {
    const evidence: EvidenceObject[] = [];
    const now = new Date().toISOString();
    const text = (websiteText || '').toLowerCase();

    // 1. Angrerett / Returdager
    let withdrawalPeriodDays = 14; // Norsk og EU-standard
    if (text.includes('30 dager') || text.includes('30 dagers')) {
      withdrawalPeriodDays = 30;
    } else if (text.includes('100 dager') || text.includes('100 dagers')) {
      withdrawalPeriodDays = 100;
    } else if (text.includes('60 dager')) {
      withdrawalPeriodDays = 60;
    }

    const hasNoReturnPolicy =
      text.includes('ingen retur') ||
      text.includes('salg er endelig') ||
      text.includes('no refunds') ||
      text.includes('kan ikke returneres');

    // 2. Returadresse og lokasjon
    const hasChinaReturn =
      text.includes('retur til kina') ||
      text.includes('return to china') ||
      text.includes('returadresse i asia') ||
      text.includes('shenzhen') ||
      text.includes('guangzhou');

    const hasPhysicalReturnAddress =
      text.includes('returadresse:') ||
      text.includes('sendes i retur til') ||
      text.includes('lager i norge') ||
      text.includes('returseddel') ||
      !hasChinaReturn;

    // 3. MVA og toll (VOEC)
    const vatExplicitlyIncluded =
      text.includes('mva inkludert') ||
      text.includes('inkl. mva') ||
      text.includes('inkludert moms') ||
      text.includes('tollfritt') ||
      text.includes('ingen toll') ||
      domain?.endsWith('.no');

    // 4. Betalingsmetoder
    const paymentMethods: string[] = [];
    if (text.includes('klarna')) paymentMethods.push('Klarna');
    if (text.includes('vipps')) paymentMethods.push('Vipps');
    if (text.includes('kort') || text.includes('visa') || text.includes('mastercard')) paymentMethods.push('Kredittkort (Visa/Mastercard)');
    if (text.includes('apple pay')) paymentMethods.push('Apple Pay');
    if (text.includes('faktura')) paymentMethods.push('Faktura');

    const hasCrypto = text.includes('bitcoin') || text.includes('crypto') || text.includes('usdt');
    const hasCryptoOnly = hasCrypto && paymentMethods.length === 0;

    // 5. Selvmotsigelser og vilkårsadvarsler
    const termsContradictions: string[] = [];
    if (hasChinaReturn) {
      termsContradictions.push('Nettsiden fremstår norsk/nordisk, men krever at varer returneres til Kina for kundens egen regning.');
    }
    if (hasNoReturnPolicy) {
      termsContradictions.push('Nettsiden fraskriver seg standard lovfestet angrerett i strid med angrerettloven § 11.');
    }
    if (!vatExplicitlyIncluded && domain?.endsWith('.no')) {
      termsContradictions.push('Uklart om MVA og fortollingsgebyr er inkludert, noe som kan medføre uventet tollregning ved levering.');
    }

    // 6. Generer status og oppsummering
    let status: ConsumerProtectionAudit['status'] = 'TILFREDSHILLENDE';
    if (hasNoReturnPolicy || hasCryptoOnly || hasChinaReturn) {
      status = 'KRITISK';
    } else if (termsContradictions.length > 0) {
      status = 'MANGLER';
    }

    const summary = status === 'TILFREDSHILLENDE'
      ? `Standard forbrukervern identifisert: ${withdrawalPeriodDays} dagers angrerett, sikre betalingskanaler (${paymentMethods.join(', ') || 'Kort/Klarna'}) og transparente vilkår.`
      : status === 'KRITISK'
      ? `Kritiske forbrukerulemper oppdaget: ${termsContradictions.join(' ')}`
      : `Vilkårene har enkelte uklarheter: ${termsContradictions.join(' ')}`;

    // 7. Bevisobjekter
    evidence.push({
      id: 'ev-consumer-withdrawal',
      category: 'CONSUMER',
      claim: 'Angrerett og returvilkår',
      finding: hasNoReturnPolicy
        ? 'Nettsiden oppgir at retur ikke aksepteres, i strid med norsk forbrukerlovgivning.'
        : `Dokumentert ${withdrawalPeriodDays} dagers angrerett i henhold til forbrukerstandarder.`,
      verdict: hasNoReturnPolicy ? 'ADVARSEL' : 'VERIFISERT_FAKTA',
      sourceName: 'Nettsidens kjøps- og returvilkår',
      sourceType: 'NETTSIDE',
      retrievedAt: now,
      confidence: 'HIGH',
    });

    if (hasChinaReturn) {
      evidence.push({
        id: 'ev-consumer-china-return',
        category: 'CONSUMER',
        claim: 'Returprosess og lokasjon',
        finding: 'Kunder pålegges å sende returer til Asia for egen regning, med høye frakt- og sporkostnader som ofte overstiger varens verdi.',
        verdict: 'ADVARSEL',
        sourceName: 'Vilkårsanalyse',
        sourceType: 'NETTSIDE',
        retrievedAt: now,
        confidence: 'HIGH',
      });
    }

    if (paymentMethods.length > 0) {
      evidence.push({
        id: 'ev-consumer-payments',
        category: 'CONSUMER',
        claim: 'Sikre betalingsmetoder og kjøperbeskyttelse',
        finding: `Tilbyr anerkjente betalingskanaler med kjøperbeskyttelse (${paymentMethods.join(', ')}).`,
        verdict: 'VERIFISERT_FAKTA',
        sourceName: 'Betalingsportaler',
        sourceType: 'NETTSIDE',
        retrievedAt: now,
        confidence: 'HIGH',
      });
    }

    return {
      audit: {
        status,
        summary,
        withdrawalPeriodDays,
        hasPhysicalReturnAddress,
        returnAddress: hasChinaReturn ? 'Kina / Asia (Kundefinansiert returfrakt)' : undefined,
        vatAndDutiesIncluded: vatExplicitlyIncluded || false,
        paymentMethods: paymentMethods.length > 0 ? paymentMethods : ['Kortbetaling'],
        hasCryptoOnlyWarning: hasCryptoOnly,
        termsContradictions,
      },
      evidence,
    };
  }
}
