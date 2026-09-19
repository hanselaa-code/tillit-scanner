import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeRequestSchema } from './middleware/validation.middleware';
import { MemoryRateLimiter } from './middleware/rate-limiter.middleware';
import { verifyAppCheckToken } from './middleware/app-check.middleware';

test('Security: Request Validation Schema', async (t) => {
  await t.test('Avviser tomme forespørsler uten bilde eller query', () => {
    const res = analyzeRequestSchema.safeParse({});
    assert.equal(res.success, false);
  });

  await t.test('Avviser forespørsel med tom streng i både image og query', () => {
    const res = analyzeRequestSchema.safeParse({ image: '', query: '   ' });
    assert.equal(res.success, false);
  });

  await t.test('Avviser for lang query (> 500 tegn)', () => {
    const longQuery = 'A'.repeat(501);
    const res = analyzeRequestSchema.safeParse({ query: longQuery });
    assert.equal(res.success, false);
    if (!res.success) {
      assert.match(res.error.errors[0].message, /for langt/);
    }
  });

  await t.test('Avviser ugyldig MIME-type (f.eks. image/gif eller image/svg)', () => {
    const res = analyzeRequestSchema.safeParse({
      image: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
      mimeType: 'image/gif' as any,
    });
    assert.equal(res.success, false);
    if (!res.success) {
      assert.match(res.error.errors[0].message, /Ugyldig MIME-type/);
    }
  });

  await t.test('Avviser bilde som overskrider 7 MB tegn (~5 MB råfil)', () => {
    const oversizedBase64 = 'A'.repeat(7 * 1024 * 1024 + 10);
    const res = analyzeRequestSchema.safeParse({
      image: oversizedBase64,
      mimeType: 'image/jpeg',
    });
    assert.equal(res.success, false);
    if (!res.success) {
      assert.match(res.error.errors[0].message, /for stort/);
    }
  });

  await t.test('Godkjenner gyldig tekstforespørsel', () => {
    const res = analyzeRequestSchema.safeParse({
      query: 'Tine SA',
    });
    assert.equal(res.success, true);
    if (res.success) {
      assert.equal(res.data.query, 'Tine SA');
    }
  });

  await t.test('Godkjenner gyldig bildeforespørsel med jpeg', () => {
    const sampleBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
    const res = analyzeRequestSchema.safeParse({
      image: sampleBase64,
      mimeType: 'image/jpeg',
    });
    assert.equal(res.success, true);
  });
});

test('Security: Rate Limiter Middleware', async (t) => {
  await t.test('Tillater kall under grensen og blokkerer ved overskridelse', () => {
    const limiter = new MemoryRateLimiter({ windowMs: 1000, maxRequests: 3 });
    const ip = '192.168.1.100';

    // 1. kall: tillatt
    const r1 = limiter.check(ip);
    assert.equal(r1.allowed, true);
    assert.equal(r1.remaining, 2);

    // 2. kall: tillatt
    const r2 = limiter.check(ip);
    assert.equal(r2.allowed, true);
    assert.equal(r2.remaining, 1);

    // 3. kall: tillatt
    const r3 = limiter.check(ip);
    assert.equal(r3.allowed, true);
    assert.equal(r3.remaining, 0);

    // 4. kall: overskredet grense (HTTP 429)
    const r4 = limiter.check(ip);
    assert.equal(r4.allowed, false);
    assert.equal(r4.remaining, 0);
    assert.ok(r4.retryAfterSeconds >= 1);

    limiter.destroy();
  });

  await t.test('Isolerer rate-grenser per IP-adresse', () => {
    const limiter = new MemoryRateLimiter({ windowMs: 1000, maxRequests: 2 });
    const ipA = '10.0.0.1';
    const ipB = '10.0.0.2';

    limiter.check(ipA);
    limiter.check(ipA);
    const blockedA = limiter.check(ipA);
    assert.equal(blockedA.allowed, false);

    // ipB skal fortsatt være tillatt
    const allowedB = limiter.check(ipB);
    assert.equal(allowedB.allowed, true);

    limiter.destroy();
  });
});

test('Security: App Check Verification', async (t) => {
  await t.test('Avviser udefinert token', async () => {
    const res = await verifyAppCheckToken(undefined);
    assert.equal(res.verified, false);
    assert.match(res.error || '', /Mangler/);
  });

  await t.test('Avviser tomt token', async () => {
    const res = await verifyAppCheckToken('');
    assert.equal(res.verified, false);
  });
});

test('Brand Mapping: Linking commercial names to Brønnøysund legal entities', async (t) => {
  const { BrandMappingService } = await import('./services/brand-mapping.service');

  await t.test('Kobler Normal til NORMAL NORGE AS (917019738)', () => {
    const mapping = BrandMappingService.findMapping('Normal');
    assert.ok(mapping);
    assert.equal(mapping?.officialName, 'NORMAL NORGE AS');
    assert.equal(mapping?.primaryOrgNr, '917019738');
  });

  await t.test('Kobler 7-Eleven til REITAN CONVENIENCE NORWAY AS (983415660)', () => {
    const mapping = BrandMappingService.findMapping('7-Eleven');
    assert.ok(mapping);
    assert.equal(mapping?.officialName, 'REITAN CONVENIENCE NORWAY AS');
    assert.equal(mapping?.primaryOrgNr, '983415660');
  });

  await t.test('Kobler Montér til OPTIMERA AS (967013056)', () => {
    const mapping = BrandMappingService.findMapping('Montér');
    assert.ok(mapping);
    assert.equal(mapping?.officialName, 'OPTIMERA AS');
    assert.equal(mapping?.primaryOrgNr, '967013056');
  });

  await t.test('Kobler Vitusapotek til NORSK MEDISINALDEPOT AS (965336796)', () => {
    const mapping = BrandMappingService.findMapping('Vitusapotek');
    assert.ok(mapping);
    assert.equal(mapping?.officialName, 'NORSK MEDISINALDEPOT AS');
    assert.equal(mapping?.primaryOrgNr, '965336796');
  });

  await t.test('Kobler domenet normal.no til Normal', () => {
    const mapping = BrandMappingService.findByDomain('www.normal.no');
    assert.ok(mapping);
    assert.equal(mapping?.brandName, 'Normal');
    assert.equal(mapping?.primaryOrgNr, '917019738');
  });

  await t.test('Kobler Sinful og sinful.no til SINFUL APS (913397045)', () => {
    const mapping = BrandMappingService.findMapping('Sinful');
    assert.ok(mapping);
    assert.equal(mapping?.officialName, 'SINFUL APS');
    assert.equal(mapping?.primaryOrgNr, '913397045');

    const byDom = BrandMappingService.findByDomain('https://www.sinful.no/product/123');
    assert.ok(byDom);
    assert.equal(byDom?.brandName, 'Sinful');
    assert.equal(byDom?.primaryOrgNr, '913397045');
  });
});

test('Brreg & Store vs Product: Resolving webshop entities and separate products', async (t) => {
  const { BrregService } = await import('./services/brreg.service');
  const { GeminiService } = await import('./services/gemini.service');

  await t.test('Brreg searchByName finner SINFUL APS (NUF) uten å bli fortrengt av urelaterte selskaper', async () => {
    const brregService = new BrregService();
    const result = await brregService.searchByName('sinful');
    assert.equal(result.found, true);
    assert.equal(result.entity?.navn, 'SINFUL APS');
    assert.equal(result.entity?.organisasjonsnummer, '913397045');
    assert.equal(result.isRegisteredInMva, true);
  });

  await t.test('GeminiService skiller forhandler/nettbutikk (Sinful) fra produkt på siden (Hims)', async () => {
    const geminiService = new GeminiService();
    const report = await geminiService.synthesizeReport({
      id: 'test-report-1',
      query: 'sinful.no',
      domain: {
        domain: 'sinful.no',
        isHttps: true,
        isSuspiciousTld: false,
        dnsResolved: true,
        flags: [],
      },
      vision: {
        extractedText: 'Hims Extra Strength sinful.no Kjøp nå',
        identifiedBrands: ['Hims'],
        detectedUrls: ['https://www.sinful.no/produkt/hims'],
        detectedOrgNumbers: [],
        visualRedFlags: [],
        summaryOfContent: 'Produktside på sinful.no for Hims',
        hasSuspiciousVisualDesign: false,
      },
      brreg: {
        found: true,
        searchedQuery: 'Sinful',
        entity: {
          organisasjonsnummer: '913397045',
          navn: 'SINFUL APS',
          organisasjonsform: { kode: 'NUF', beskrivelse: 'Norskregistrert utenlandsk foretak' },
          registrertIMvaregisteret: true,
          konkurs: false,
          underAvvikling: false,
          underTvangsavviklingEllerTvangsopplosning: false,
        },
        warningFlags: [],
        isDissolvedOrBankrupt: false,
        isRegisteredInMva: true,
        brandLink: {
          brandName: 'Sinful',
          officialName: 'SINFUL APS',
          relationship: 'Norskregistrert utenlandsk foretak (NUF) for sinful.no',
          primaryOrgNr: '913397045',
        },
      },
      detectedProduct: 'Hims',
    });

    // Subjektet MÅ være butikken/kjeden (Sinful), IKKE produktet (Hims)
    assert.equal(report.identifiedSubject.name, 'Sinful');
    assert.equal(report.identifiedSubject.legalName, 'SINFUL APS');
    assert.equal(report.identifiedSubject.orgNumber, '913397045');
    // Produktet skal være registrert som detectedProduct
    assert.equal(report.identifiedSubject.detectedProduct, 'Hims');
    // Scoren skal være grønn (lav risiko)
    assert.equal(report.trafficLight, 'GREEN');
  });
});
