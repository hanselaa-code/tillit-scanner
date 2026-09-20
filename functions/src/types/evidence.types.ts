/**
 * Trust Scanner - Evidence Object Specification
 * 
 * Følger prinsippet: "Vis konklusjonen, men vis også hvorfor."
 * Hvert funn i rapporten er forankret i et strukturert bevisobjekt.
 */

export type EvidenceCategory =
  | 'IDENTITY'           // Virksomhetsidentitet & registrering
  | 'FINANCIAL'          // Økonomisk substans & regnskap
  | 'DIGITAL'            // Domene & digital identitet
  | 'CONSUMER'           // Forbrukervern, angrerett, retur
  | 'REVIEWS'            // Kundeanmeldelser & omdømme
  | 'PRODUCT'            // Produkt & supply chain / OEM
  | 'CLAIMS'             // Markedsføringspåstander
  | 'MEDICAL'            // Medisinsk/helsefaglig evidens (Dr. Mike)
  | 'EXTERNAL_RISK';     // Eksterne varsellister & sikkerhetssignaler

export type EvidenceVerdict =
  | 'VERIFISERT_FAKTA'   // Dokumentert i offentlig register eller uavhengig kilde
  | 'INFERENS'           // Faglig/logisk analyse basert på aggregerte data
  | 'IKKE_VERIFISERT'    // Påstand eller informasjon som mangler uavhengig bekreftelse
  | 'ADVARSEL'           // Observasjon av mistenkelig eller risikabelt mønster
  | 'MOTSTRIDENDE';      // Direkte uoverensstemmelse mellom to uavhengige kilder

export type EvidenceSourceType =
  | 'OFFISIELT_REGISTER'          // Brønnøysund, CVR, Skatteetaten osv.
  | 'FAGFELLEVURDERT_FORSKNING'   // Cochrane, PubMed, WHO, EFSA, DMP
  | 'BRUKEROMTALER'               // Trustpilot, Google Reviews, verifiserte kjøp
  | 'NETTSIDE'                    // Aktørens egne vilkår, "om oss", produktbeskrivelse
  | 'TEKNISK_OPPSLAG'             // DNS, SSL, WHOIS, IP-analyse
  | 'EKSTERN_LISTE';              // Forbrukertilsynet, Varslingslisten, Økokrim

export type EvidenceConfidence = 'HIGH' | 'MODERATE' | 'LOW';

export interface EvidenceObject {
  id: string;
  category: EvidenceCategory;
  claim: string;                  // Hva som ble undersøkt / påstått
  finding: string;                // Hva undersøkelsen faktisk avdekket
  verdict: EvidenceVerdict;
  sourceName: string;             // Navn på kilden (f.eks. "Brønnøysundregistrene - Enhetsregisteret")
  sourceUrl?: string;             // Direkte lenke til kilden eller registeroppføringen
  sourceType: EvidenceSourceType;
  retrievedAt: string;            // ISO-tidsstempel for når data ble hentet (ferskhetsgaranti)
  confidence: EvidenceConfidence;
  supportingSnippet?: string;     // Råtekst/utdrag som underbygger funnet
  contradictingSnippet?: string;  // Eventuell motstridende dokumentasjon
}
