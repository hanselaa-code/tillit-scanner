import {
  DrMikeMedicalReport,
  DrMikeClaimVerification,
  DrMikeEvidenceLevel,
  DrMikeEvidenceVerdict,
} from '../types/trust-report.types';
import { EvidenceObject } from '../types/evidence.types';

export class DrMikeService {
  /**
   * Dr. Mike Medical Evidence Verification Engine
   * Gransker helse-, velvære- og fysiologiske påstander etter evidenspyramiden (Level A - E).
   */
  public verifyClaims(
    rawText?: string,
    detectedClaims: string[] = []
  ): { report: DrMikeMedicalReport; evidence: EvidenceObject[] } {
    const evidence: EvidenceObject[] = [];
    const now = new Date().toISOString();
    const text = `${rawText || ''} ${detectedClaims.join(' ')}`.toLowerCase();

    // 1. Kunnskapsbase for vitenskapelige dommer basert på Level A-E evidens
    const knownClaimRules = [
      {
        pattern: /(?:98[\.,]5|100)\s*%\s*(?:nøyaktighet|presisjon|accuracy)/i,
        claimTitle: '98.5–100 % presisjon sammenlignet med profesjonelle kroppsskannere',
        verdict: 'INSUFFICIENT_EVIDENCE' as DrMikeEvidenceVerdict,
        verdictLabel: 'Ikke uavhengig verifisert',
        level: 'LEVEL_E_PRODUSENTENS_DATA' as DrMikeEvidenceLevel,
        quality: 'LOW' as const,
        whatTheEvidenceSays: 'Bioelektrisk impedans (BIA) som brukes i forbrukervekter gir et estimat av kroppssammensetning, men påvirkes betydelig av væskebalanse, matinntak og hudtemperatur. DEXA-skanning og hydrostatisk veiing forblir gullstandarden.',
        statVsClin: 'Selv om apparatet kan måle motstand (impedans) med lav målefeil, betyr ikke det at estimatet av fettprosent har 98.5-100 % klinisk samsvar med DEXA.',
        limitation: 'Dokumentasjonen støtter BIA-teknologiens overordnede mekanistiske prinsipp, men vi fant ingen fagfellevurderte uavhengige valideringsstudier av akkurat denne modellen.',
        sources: ['Cochrane Library', 'PubMed / NIH', 'American Journal of Clinical Nutrition'],
      },
      {
        pattern: /(?:forbrenner|fjerner|smelter)\s+(?:fett|magefett|vekt)\s+(?:over natten|raskt|på \d+ dager)/i,
        claimTitle: 'Rask fettforbrenning eller punktforbrenning av magefett',
        verdict: 'EVIDENCE_CONTRADICTS_CLAIM' as DrMikeEvidenceVerdict,
        verdictLabel: 'Motsagt av vitenskapelig konsensus',
        level: 'LEVEL_A_SYSTEMATISK_OVERSIKT' as DrMikeEvidenceLevel,
        quality: 'HIGH' as const,
        whatTheEvidenceSays: 'Menneskekroppens fysiologi tillater ikke punktforbrenning av fettvev via enkeltpreparater eller apparater. Fettoksidasjon krever et systemisk energikonsum som overgår inntaket over tid.',
        statVsClin: 'Ingen klinisk relevant effekt på fettmasse er påvist uten kalorirestriksjon.',
        limitation: 'Påstanden strider fundamentalt mot etablert endokrinologi og energimetabolisme.',
        sources: ['WHO Guidelines on Obesity', 'EFSA Panel on Dietetic Products', 'Helsedirektoratet'],
      },
      {
        pattern: /(?:kurerer|helbreder|fjerner)\s+(?:smerter|leddsmerter|artrose|leddgikt|betennelse)/i,
        claimTitle: 'Kurerer eller helbreder leddgikt og kroniske leddsmerter',
        verdict: 'EVIDENCE_CONTRADICTS_CLAIM' as DrMikeEvidenceVerdict,
        verdictLabel: 'Advarsel: Medisinsk uholdbart',
        level: 'LEVEL_A_SYSTEMATISK_OVERSIKT' as DrMikeEvidenceLevel,
        quality: 'HIGH' as const,
        whatTheEvidenceSays: 'Artrose og leddgikt er degenerative eller autoimmune tilstander som ikke kureres av kosttilskudd. Enkelte stoffer (som kollagen eller glukosamin) har vært studert, men systematiske oversikter viser marginal eller placebolignende effekt.',
        statVsClin: 'Små statistiske endringer i enkelte pilotstudier har ikke vist klinisk signifikant bedring av leddfunksjon i store meta-analyser.',
        limitation: 'Å love helbredelse for kroniske sykdommer bryter med retningslinjer fra Legemiddelverket og Forbrukertilsynet.',
        sources: ['Cochrane Musculoskeletal Group', 'Direktoratet for medisinske produkter (DMP)', 'EULAR'],
      },
      {
        pattern: /(?:renser kroppen for giftstoffer|detox)/i,
        claimTitle: 'Detox – avgiftning og fjerning av giftstoffer fra kroppen',
        verdict: 'EVIDENCE_CONTRADICTS_CLAIM' as DrMikeEvidenceVerdict,
        verdictLabel: 'Medisinsk myte',
        level: 'LEVEL_A_SYSTEMATISK_OVERSIKT' as DrMikeEvidenceLevel,
        quality: 'HIGH' as const,
        whatTheEvidenceSays: 'Leveren, nyrene, lungene og mage-tarm-kanalen utfører kroppens kontinuerlige avgiftning. Det finnes ingen uavhengige kliniske studier som bekrefter at kommersielle detox-produkter øker utskillelsen av toksiner.',
        limitation: 'Begrepet "detox" i markedsføring er et udefinert markedsføringsbegrep uten forankring i medisinsk toksikologi.',
        sources: ['British Dietetic Association', 'EFSA', 'Helsedirektoratet'],
      },
      {
        pattern: /(?:forbedrer|styrker)\s+(?:balansen|holdningen|styrken)/i,
        claimTitle: 'Forbedrer balanse, stabilitet eller muskelaktivering',
        verdict: 'MODERATE_EVIDENCE' as DrMikeEvidenceVerdict,
        verdictLabel: 'Moderat evidens for treningsprinsippet',
        level: 'LEVEL_B_RCT_STUDIE' as DrMikeEvidenceLevel,
        quality: 'MODERATE' as const,
        whatTheEvidenceSays: 'Det finnes forskning som støtter at ustabile underlag eller spesifikke balanseøvelser kan stimulere nevromuskulær kontroll hos eldre eller under rehabilitering.',
        statVsClin: 'Klinisk nytteverdi forutsetter regelmessig trening over uker, ikke magiske passive effekter.',
        limitation: 'Forskningen gjelder treningsprinsippet generelt, ikke nødvendigvis dette spesifikke merket.',
        sources: ['Journal of Physiotherapy', 'PubMed', 'NICE Guidelines'],
      },
      {
        pattern: /(?:klinisk dokumentert|vitenskapelig bevist)/i,
        claimTitle: 'Klinisk dokumentert effekt',
        verdict: 'INSUFFICIENT_EVIDENCE' as DrMikeEvidenceVerdict,
        verdictLabel: 'Uavhengig dokumentasjon mangler',
        level: 'LEVEL_E_PRODUSENTENS_DATA' as DrMikeEvidenceLevel,
        quality: 'LOW' as const,
        whatTheEvidenceSays: 'Å kalle et produkt "klinisk dokumentert" krever henvisning til publiserte, fagfellevurderte studier på mennesker med nøyaktig samme formulering/produkt.',
        limitation: 'Produsentens interne undersøkelser eller pilotstudier uten kontrollgruppe kvalifiserer ikke som uavhengig klinisk evidens.',
        sources: ['ICMJE Standards', 'Cochrane Collaboration'],
      },
    ];

    const claims: DrMikeClaimVerification[] = [];

    for (const rule of knownClaimRules) {
      if (rule.pattern.test(text)) {
        claims.push({
          claim: rule.claimTitle,
          verdict: rule.verdict,
          verdictLabel: rule.verdictLabel,
          evidenceLevel: rule.level,
          evidenceQuality: rule.quality,
          whatTheEvidenceSays: rule.whatTheEvidenceSays,
          statisticalVsClinicalSignificance: rule.statVsClin,
          importantLimitation: rule.limitation,
          sources: rule.sources,
        });

        evidence.push({
          id: `ev-medical-claim-${Math.random().toString(36).substring(7)}`,
          category: 'MEDICAL',
          claim: rule.claimTitle,
          finding: `Dr. Mike vurdering: ${rule.verdictLabel}. ${rule.whatTheEvidenceSays}`,
          verdict: rule.verdict === 'EVIDENCE_CONTRADICTS_CLAIM' ? 'ADVARSEL' : 'INFERENS',
          sourceName: rule.sources[0] || 'Medisinsk forskning',
          sourceType: 'FAGFELLEVURDERT_FORSKNING',
          retrievedAt: now,
          confidence: rule.quality === 'HIGH' ? 'HIGH' : 'MODERATE',
          supportingSnippet: rule.limitation,
        });
      }
    }

    const hasMedicalClaims = claims.length > 0;

    let overallDoctorVerdict = 'Ingen helserelaterte påstander identifisert';
    let doctorSummary = '';

    if (hasMedicalClaims) {
      const hasContradicted = claims.some((c) => c.verdict === 'EVIDENCE_CONTRADICTS_CLAIM');
      const hasUnverified = claims.some((c) => c.verdict === 'INSUFFICIENT_EVIDENCE');

      if (hasContradicted) {
        overallDoctorVerdict = 'Reklamen fremsetter fysiologisk uholdbare eller motbeviste helsepåstander';
        doctorSummary =
          'Pee-woop! La oss se på hva biologien og forskningen faktisk sier her. Annonsen benytter klassiske overdrivelser som lover resultater menneskekroppen ikke kan levere på denne måten. Ikke la deg lure av ord som "klinisk bevist" når uavhengige Level A-studier (Cochrane/meta-analyser) ikke støtter påstanden.';
      } else if (hasUnverified) {
        overallDoctorVerdict = 'Teknologien har plausible mekanismer, men konkrete markedsføringsløfter mangler uavhengig validering';
        doctorSummary =
          'Mekanismen bak produktet kan ha en viss fysiologisk forankring i litteraturen, men produsenten strekker strikken for langt når de lover ekstrem nøyaktighet eller garanterte resultater. Dokumentasjonen støtter overordnede biologiske prinsipper bedre enn selve produktpåstanden.';
      } else {
        overallDoctorVerdict = 'Dokumentert i tråd med etablerte trenings- eller fysiologiske prinsipper';
        doctorSummary =
          'Påstandene fremstår nøkterne og samsvarer med det vi vet fra uavhengig forskning. Husk likevel at personlig innsats og helhetlig livsstil alltid er avgjørende for reell effekt.';
      }
    }

    const disclaimer =
      'Denne medisinske faktasjekken er basert på tilgjengelig medisinsk forskning og konsensus for generell folkeopplysning. Den erstatter aldri individuell medisinsk vurdering, diagnose eller behandling hos autorisert lege.';

    return {
      report: {
        hasMedicalClaims,
        overallDoctorVerdict,
        doctorSummary,
        claims,
        disclaimer,
      },
      evidence,
    };
  }
}
