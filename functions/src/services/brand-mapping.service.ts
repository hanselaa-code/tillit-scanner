export interface BrandMapping {
  brandName: string;
  aliases: string[];
  primaryOrgNr: string;
  officialName: string;
  relationship: string;
  domains?: string[];
}

/**
 * Kunnskapsbase for kjente norske butikkjeder, varemerker og handelsaktører
 * som opererer under et annet juridisk foretaksnavn i Brønnøysundregistrene.
 */
export const KNOWN_BRAND_MAPPINGS: BrandMapping[] = [
  {
    brandName: 'Normal',
    aliases: ['normal', 'normal norge', 'normal butikk'],
    primaryOrgNr: '917019738',
    officialName: 'NORMAL NORGE AS',
    relationship: 'Driftsselskap i Norge',
    domains: ['normal.no'],
  },
  {
    brandName: '7-Eleven',
    aliases: ['7 eleven', '7-eleven', '7eleven'],
    primaryOrgNr: '983415660',
    officialName: 'REITAN CONVENIENCE NORWAY AS',
    relationship: 'Master franchisetaker og driftsselskap i Norge (Reitan)',
    domains: ['7-eleven.no'],
  },
  {
    brandName: 'Narvesen',
    aliases: ['narvesen', 'narvesen kiosk'],
    primaryOrgNr: '983415660',
    officialName: 'REITAN CONVENIENCE NORWAY AS',
    relationship: 'Kjede- og driftsselskap (Reitan)',
    domains: ['narvesen.no'],
  },
  {
    brandName: 'Montér',
    aliases: ['monter', 'montér', 'monter bygg', 'montér bygg'],
    primaryOrgNr: '967013056',
    officialName: 'OPTIMERA AS',
    relationship: 'Kjede- og eierselskap (Optimera)',
    domains: ['monter.no'],
  },
  {
    brandName: 'Byggmakker',
    aliases: ['byggmakker', 'byggmakker handel'],
    primaryOrgNr: '979895244',
    officialName: 'BYGGMAKKER HANDEL AS',
    relationship: 'Kjede- og driftsselskap',
    domains: ['byggmakker.no'],
  },
  {
    brandName: 'Maxbo',
    aliases: ['maxbo', 'maxbo pro', 'maxbo stormarked'],
    primaryOrgNr: '980079872',
    officialName: 'MAXBO AS',
    relationship: 'Kjededrift (Løvenskiold-konsernet)',
    domains: ['maxbo.no'],
  },
  {
    brandName: 'Vitusapotek',
    aliases: ['vitusapotek', 'vitus apotek'],
    primaryOrgNr: '965336796',
    officialName: 'NORSK MEDISINALDEPOT AS',
    relationship: 'Kjede- og eierselskap (NMD)',
    domains: ['vitusapotek.no'],
  },
  {
    brandName: 'Boots Apotek',
    aliases: ['boots apotek', 'boots', 'boots norge'],
    primaryOrgNr: '982547822',
    officialName: 'ALLIANCE HEALTHCARE NORGE APOTEKDRIFT AS',
    relationship: 'Apotekkjedens driftsselskap i Norge (Alliance Healthcare)',
    domains: ['boots.no'],
  },
  {
    brandName: 'Apotek 1',
    aliases: ['apotek 1', 'apotek1', 'apotek en'],
    primaryOrgNr: '983044778',
    officialName: 'APOTEK 1 GRUPPEN AS',
    relationship: 'Kjede- og eierselskap',
    domains: ['apotek1.no'],
  },
  {
    brandName: 'McDonald\'s',
    aliases: ['mcdonalds', 'mcdonald\'s', 'mc donalds', 'maccen'],
    primaryOrgNr: '950173378',
    officialName: 'FOOD FOLK NORGE AS',
    relationship: 'Master franchisetaker og driftsselskap i Norge (Food Folk)',
    domains: ['mcdonalds.no'],
  },
  {
    brandName: 'Burger King',
    aliases: ['burger king', 'burgerking', 'bk'],
    primaryOrgNr: '984388608',
    officialName: 'KING FOOD AS',
    relationship: 'Master franchisetaker og driftsselskap i Norge (King Food)',
    domains: ['burgerking.no'],
  },
  {
    brandName: 'Coop',
    aliases: ['coop', 'coop norge', 'obs', 'coop obs', 'extra', 'coop extra', 'coop mega', 'coop prix', 'coop marked', 'obs bygg'],
    primaryOrgNr: '936560288',
    officialName: 'COOP NORGE SA',
    relationship: 'Hovedsamvirke og kjedeeier for Coop, Obs og Extra',
    domains: ['coop.no', 'obs.no', 'extra.no', 'obsbygg.no'],
  },
  {
    brandName: 'Kiwi',
    aliases: ['kiwi', 'kiwi minipris', 'kiwi norge'],
    primaryOrgNr: '971038481',
    officialName: 'KIWI NORGE AS',
    relationship: 'Kjedeselskap i NorgesGruppen',
    domains: ['kiwi.no'],
  },
  {
    brandName: 'Meny',
    aliases: ['meny', 'meny butikk'],
    primaryOrgNr: '979402506',
    officialName: 'MENY AS',
    relationship: 'Kjedeselskap i NorgesGruppen',
    domains: ['meny.no'],
  },
  {
    brandName: 'Spar',
    aliases: ['spar', 'eurospar', 'spar butikk'],
    primaryOrgNr: '979148006',
    officialName: 'SPAR NORGE AS',
    relationship: 'Kjedeselskap i NorgesGruppen',
    domains: ['spar.no'],
  },
  {
    brandName: 'Joker',
    aliases: ['joker', 'joker butikk'],
    primaryOrgNr: '979148014',
    officialName: 'JOKER NORGE AS',
    relationship: 'Kjedeselskap i NorgesGruppen',
    domains: ['joker.no'],
  },
  {
    brandName: 'Dressmann',
    aliases: ['dressmann', 'dressmann xl'],
    primaryOrgNr: '979490674',
    officialName: 'VARNER AS',
    relationship: 'Kjede- og eierkonsern (Varner)',
    domains: ['dressmann.com'],
  },
  {
    brandName: 'Cubus',
    aliases: ['cubus', 'cubus butikk'],
    primaryOrgNr: '979490674',
    officialName: 'VARNER AS',
    relationship: 'Kjede- og eierkonsern (Varner)',
    domains: ['cubus.com'],
  },
  {
    brandName: 'Carlings',
    aliases: ['carlings'],
    primaryOrgNr: '979490674',
    officialName: 'VARNER AS',
    relationship: 'Kjede- og eierkonsern (Varner)',
    domains: ['carlings.com'],
  },
  {
    brandName: 'Bik Bok',
    aliases: ['bik bok', 'bikbok'],
    primaryOrgNr: '979490674',
    officialName: 'VARNER AS',
    relationship: 'Kjede- og eierkonsern (Varner)',
    domains: ['bikbok.com'],
  },
  {
    brandName: 'Volt',
    aliases: ['volt', 'volt fashion', 'volt magasin'],
    primaryOrgNr: '979490674',
    officialName: 'VARNER AS',
    relationship: 'Kjede- og eierkonsern (Varner)',
    domains: ['voltfashion.com'],
  },
  {
    brandName: 'Kid Interiør',
    aliases: ['kid', 'kid interiør', 'kid interior'],
    primaryOrgNr: '958467095',
    officialName: 'KID INTERIØR AS',
    relationship: 'Kjede- og driftsselskap',
    domains: ['kid.no'],
  },
  {
    brandName: 'Princess',
    aliases: ['princess', 'princess interiør'],
    primaryOrgNr: '921429541',
    officialName: 'PRINCESS AS',
    relationship: 'Kjede- og driftsselskap',
    domains: ['princessbutikken.no'],
  },
  {
    brandName: 'Kitch\'n',
    aliases: ['kitchn', 'kitch\'n'],
    primaryOrgNr: '984534795',
    officialName: 'HOMEBRANDS AS',
    relationship: 'Kjede- og konsernselskap',
    domains: ['kitchn.no'],
  },
  {
    brandName: 'Tilbords',
    aliases: ['tilbords', 'til bords'],
    primaryOrgNr: '984534795',
    officialName: 'HOMEBRANDS AS',
    relationship: 'Kjede- og konsernselskap',
    domains: ['tilbords.no'],
  },
  {
    brandName: 'Synsam',
    aliases: ['synsam', 'synsam optikk'],
    primaryOrgNr: '994496093',
    officialName: 'SYNSAM GROUP NORWAY AS',
    relationship: 'Driftsselskap i Norge',
    domains: ['synsam.no'],
  },
  {
    brandName: 'Specsavers',
    aliases: ['specsavers', 'specsavers optikk'],
    primaryOrgNr: '987644087',
    officialName: 'SPECSAVERS NORWAY AS',
    relationship: 'Driftsselskap i Norge',
    domains: ['specsavers.no'],
  },
  {
    brandName: 'Power',
    aliases: ['power', 'power norge', 'expert'],
    primaryOrgNr: '977047838',
    officialName: 'POWER NORGE AS',
    relationship: 'Driftsselskap i Norge',
    domains: ['power.no'],
  },
  {
    brandName: 'Elkjøp',
    aliases: ['elkjop', 'elkjøp', 'elkjop norge', 'elkjøp norge'],
    primaryOrgNr: '947054600',
    officialName: 'ELKJØP NORGE AS',
    relationship: 'Driftsselskap i Norge',
    domains: ['elkjop.no'],
  },
  {
    brandName: 'Komplett',
    aliases: ['komplett', 'komplett.no'],
    primaryOrgNr: '980213250',
    officialName: 'KOMPLETT ASA',
    relationship: 'Kjerneselskap i konsernet',
    domains: ['komplett.no'],
  },
  {
    brandName: 'Jula',
    aliases: ['jula', 'jula norge'],
    primaryOrgNr: '890036732',
    officialName: 'JULA NORGE AS',
    relationship: 'Driftsselskap i Norge',
    domains: ['jula.no'],
  },
  {
    brandName: 'Biltema',
    aliases: ['biltema', 'biltema norge'],
    primaryOrgNr: '882692302',
    officialName: 'BILTEMA NORGE AS',
    relationship: 'Driftsselskap i Norge',
    domains: ['biltema.no'],
  },
  {
    brandName: 'Clas Ohlson',
    aliases: ['clas ohlson', 'clasohlson'],
    primaryOrgNr: '937402198',
    officialName: 'CLAS OHLSON AS',
    relationship: 'Driftsselskap i Norge',
    domains: ['clasohlson.no', 'clasohlson.com'],
  },
  {
    brandName: 'XXL',
    aliases: ['xxl', 'xxl sport', 'xxl villmark'],
    primaryOrgNr: '881932792',
    officialName: 'XXL SPORT & VILLMARK AS',
    relationship: 'Kjede- og driftsselskap',
    domains: ['xxl.no'],
  },
  {
    brandName: 'Europris',
    aliases: ['europris'],
    primaryOrgNr: '986762469',
    officialName: 'EUROPRIS AS',
    relationship: 'Kjede- og driftsselskap',
    domains: ['europris.no'],
  },
  {
    brandName: 'Nille',
    aliases: ['nille'],
    primaryOrgNr: '918468919',
    officialName: 'NILLE AS',
    relationship: 'Kjede- og driftsselskap',
    domains: ['nille.no'],
  },
  {
    brandName: 'Circle K',
    aliases: ['circle k', 'circlek', 'statoil'],
    primaryOrgNr: '914766451',
    officialName: 'CIRCLE K NORGE AS',
    relationship: 'Drivstoff- og stasjonsselskap i Norge',
    domains: ['circlek.no'],
  },
  {
    brandName: 'Uno-X',
    aliases: ['uno x', 'uno-x', 'unox'],
    primaryOrgNr: '921757131',
    officialName: 'UNO-X MOBILITY NORGE AS',
    relationship: 'Drivstoff- og mobilitetsselskap i Norge',
    domains: ['unox.no'],
  },
  {
    brandName: 'Peppes Pizza',
    aliases: ['peppes pizza', 'peppes'],
    primaryOrgNr: '984388659',
    officialName: 'PEPPES PIZZA AS',
    relationship: 'Restaurant- og kjedeselskap',
    domains: ['peppes.no'],
  },
  {
    brandName: 'Tine',
    aliases: ['tine', 'tine meierier'],
    primaryOrgNr: '947942638',
    officialName: 'TINE SA',
    relationship: 'Produsent og samvirkeselskap',
    domains: ['tine.no'],
  },
  {
    brandName: 'Gilde',
    aliases: ['gilde', 'prior'],
    primaryOrgNr: '938752648',
    officialName: 'NORTURA SA',
    relationship: 'Produsent og samvirkeselskap (Nortura)',
    domains: ['gilde.no', 'prior.no', 'nortura.no'],
  },
  {
    brandName: 'Get Inspired',
    aliases: ['get inspired', 'getinspired'],
    primaryOrgNr: '912636712',
    officialName: 'GET INSPIRED AS',
    relationship: 'Nettbutikk og driftsselskap',
    domains: ['getinspired.no'],
  },
  {
    brandName: 'Sats',
    aliases: ['sats', 'sats elixia'],
    primaryOrgNr: '981297598',
    officialName: 'SATS NORGE AS',
    relationship: 'Treningssenterkjede i Norge',
    domains: ['sats.no'],
  },
  {
    brandName: 'Vipps',
    aliases: ['vipps', 'vipps mobilepay'],
    primaryOrgNr: '918713859',
    officialName: 'VIPPS MOBILLEPAY AS',
    relationship: 'Betalingstjeneste og finansforetak',
    domains: ['vipps.no'],
  },
  {
    brandName: 'Finn.no',
    aliases: ['finn', 'finn.no', 'finn no'],
    primaryOrgNr: '981159772',
    officialName: 'FINN.NO AS',
    relationship: 'Markedsplass (Schibsted-konsernet)',
    domains: ['finn.no'],
  },
  {
    brandName: 'Sinful',
    aliases: ['sinful', 'sinful.no', 'sinful norge', 'sinful aps'],
    primaryOrgNr: '913397045',
    officialName: 'SINFUL APS',
    relationship: 'Norskregistrert utenlandsk foretak (NUF) for sinful.no',
    domains: ['sinful.no'],
  },
  {
    brandName: 'Blivakker',
    aliases: ['blivakker', 'bli vakker', 'blivakker.no', 'brands nordic'],
    primaryOrgNr: '991823798',
    officialName: 'BRANDS NORDIC AS',
    relationship: 'Driftsselskap for Blivakker.no',
    domains: ['blivakker.no'],
  },
  {
    brandName: 'Farmasiet',
    aliases: ['farmasiet', 'farmasiet.no', 'komplett apotek'],
    primaryOrgNr: '914041791',
    officialName: 'FARMASIET AS',
    relationship: 'Nettapotek og driftsselskap',
    domains: ['farmasiet.no'],
  },
  {
    brandName: 'Milrab',
    aliases: ['milrab', 'milrab.no'],
    primaryOrgNr: '990710671',
    officialName: 'MILRAB AS',
    relationship: 'Nettbutikk og driftsselskap',
    domains: ['milrab.no'],
  },
];

export class BrandMappingService {
  /**
   * Slår opp et merkenavn eller butikknavn for å finne det juridiske driftsselskapet.
   */
  public static findMapping(input: string): BrandMapping | undefined {
    if (!input) return undefined;
    const clean = input
      .toLowerCase()
      .replace(/[^a-zæøå0-9]/g, '')
      .trim();

    if (!clean) return undefined;

    for (const mapping of KNOWN_BRAND_MAPPINGS) {
      for (const alias of mapping.aliases) {
        const cleanAlias = alias.replace(/[^a-zæøå0-9]/g, '');
        if (clean === cleanAlias || clean === mapping.brandName.toLowerCase().replace(/[^a-zæøå0-9]/g, '')) {
          return mapping;
        }
      }
    }

    // Delvis treff hvis søkeordet er langt nok (f.eks. "Normal Karl Johan" eller "Montér Vika")
    if (clean.length >= 4) {
      for (const mapping of KNOWN_BRAND_MAPPINGS) {
        for (const alias of mapping.aliases) {
          const cleanAlias = alias.replace(/[^a-zæøå0-9]/g, '');
          if (cleanAlias.length >= 4 && (clean.startsWith(cleanAlias) || clean.includes(cleanAlias))) {
            return mapping;
          }
        }
      }
    }

    return undefined;
  }

  /**
   * Slår opp et domene mot kjente kjededropper (f.eks. "normal.no" -> Normal).
   */
  public static findByDomain(domain: string): BrandMapping | undefined {
    if (!domain) return undefined;
    const cleanDom = domain.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];

    for (const mapping of KNOWN_BRAND_MAPPINGS) {
      if (mapping.domains?.some((d) => cleanDom === d || cleanDom.endsWith('.' + d))) {
        return mapping;
      }
    }
    return undefined;
  }
}
