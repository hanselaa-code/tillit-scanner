# SCANSAFE / TILLIT 🛡️🇳🇴
### Intelligent AI-verktøy for avsløring av svindel, falske annonser og useriøse aktører

ScanSafe (Tillit) er en produksjonsklar cross-platform mobilapp (iOS & Android) med en serverless Firebase / Gemini AI backend, utviklet spesielt for norske forbrukere.

---

## 🏗️ Systemarkitektur & Flyt

```
                   ┌───────────────────────────────────┐
                   │        Mobilapp (Flutter)         │
                   │  - Kamera (Plakat / Flyer / SMS)  │
                   │  - Galleri (Skjermbilde fra SoMe) │
                   │  - Manuell URL / Navn / Org.nr    │
                   └─────────────────┬─────────────────┘
                                     │ POST /analyzeEntity
                                     ▼
                   ┌───────────────────────────────────┐
                   │ Firebase Cloud Functions (Node/TS)│
                   │        Orchestrator Service       │
                   └───────┬──────────┬───────────┬────┘
                           │          │           │
            ┌──────────────┘          │           └──────────────┐
            ▼                         ▼                          ▼
┌───────────────────────┐ ┌───────────────────────┐ ┌─────────────────────────┐
│ Gemini 2.5 Flash / AI │ │ Brønnøysundregistrene │ │ Domene- & Sikkerhet     │
│ - Multimodal OCR      │ │ - Enhetsregisteret    │ │ - DNS / Toppdomener     │
│ - Merkevare-spoofing  │ │ - MVA & Stiftelsesdato│ │ - HTTPS / Sertifikat    │
│ - Manipulert nyhet/TV │ │ - Konkurs & Avvikling │ │ - Spoofing / Typosquat  │
│ - Tidspress-deteksjon │ │ - Næringskoder        │ │ - Varslingslisten       │
└───────────┬───────────┘ └───────────┬───────────┘ └────────────┬────────────┘
            │                         │                          │
            └─────────────────────────┼──────────────────────────┘
                                      ▼
                   ┌───────────────────────────────────┐
                   │      Objektiv Scoring-motor       │
                   │  - Seriøsitetsscore: 0 - 100      │
                   │  - Trafikklys: Rød / Gul / Grønn  │
                   │  - Punktvise risikofaktorer       │
                   │  - Konkrete forbrukerråd (NO)     │
                   └───────────────────────────────────┘
```

---

## 📁 Prosjektstruktur

```
svindel app/
├── .github/
│   └── workflows/
│       └── ci.yml                 # Automatisk GitHub Actions CI for Flutter & Functions
├── firebase.json                  # Firebase CLI-konfigurasjon for emulering og deploy
├── functions/                     # Backend (Firebase Cloud Functions v2 & TypeScript)
│   ├── src/
│   │   ├── services/
│   │   │   ├── brreg.service.ts       # Sanntidsoppslag mot Brønnøysundregistrene
│   │   │   ├── domain.service.ts      # Domenealder, SSL, spoofing og DNS-validering
│   │   │   ├── gemini.service.ts      # Multimodal bildeanalyse og syntetisering
│   │   │   ├── reputation.service.ts  # Varslingslisten og svindelmønster-sjekk
│   │   │   └── orchestrator.service.ts# Samordning av alle datakilder
│   │   ├── types/
│   │   │   └── analysis.types.ts      # TypeScript-definisjoner for rapporter og data
│   │   └── index.ts                   # Hovedendepunkt (analyzeEntity)
│   ├── .env.example                   # Eksempel på miljøvariabler
│   ├── package.json
│   └── tsconfig.json
├── mobile/                        # Frontend (Flutter cross-platform iOS & Android)
│   ├── lib/
│   │   ├── models/
│   │   │   └── analysis_result.dart   # Datamodeller for risikoscore og rapporter
│   │   ├── screens/
│   │   │   ├── home_screen.dart       # Kamerasøker, galleriopplasting, søkefelt
│   │   │   └── result_screen.dart     # Seriøsitetsscore (0-100), råd og Brreg-kort
│   │   ├── services/
│   │   │   └── api_service.dart       # API-klient mot backend (med offline demo-fallback)
│   │   ├── theme/
│   │   │   └── app_theme.dart         # Nordisk mørkt sikkerhetstema
│   │   ├── widgets/
│   │   │   ├── detail_accordion.dart  # Ekspanderbare detaljkort for Brreg, nett og bilde
│   │   │   ├── risk_factor_tile.dart  # Faresignal- og trygghetsbrikker
│   │   │   └── score_gauge.dart       # Animert sirkulær risikoscore-måler
│   │   └── main.dart                  # Hovedoppstart
│   └── pubspec.yaml
└── README.md
```

---

## 🚀 Kom i gang (Lokal kjøring)

### 1. Kjøre backend (Firebase Functions)
1. Gå inn i `functions`-mappen:
   ```bash
   cd functions
   ```
2. Opprett en `.env`-fil basert på `.env.example`:
   ```bash
   cp .env.example .env
   ```
   Legg inn din Gemini API-nøkkel fra [Google AI Studio](https://aistudio.google.com/).
3. Bygg og start funksjonene med Firebase Emulator:
   ```bash
   npm run build
   npx firebase emulators:start --only functions
   ```
   *Endepunktet blir tilgjengelig på `http://localhost:5001/<ditt-prosjekt>/us-central1/analyzeEntity`.*

---

### 2. Kjøre mobilappen (Flutter)
1. Gå inn i `mobile`-mappen:
   ```bash
   cd mobile
   ```
2. Start appen på tilkoblet enhet eller emulator:
   ```bash
   flutter run
   ```
   *Tips: Mobilappen har en innebygd intelligent offline demo-modus. Dersom du kjører appen før backend er startet, vil den automatisk gi realistiske eksempelanalyser!*

---

## ⚖️ Juridisk utforming & Forbrukervern
Vurderingene og tekstene som produseres av systemet er designet for å være **nøytrale og etterrettelige risikovurderinger** («Observasjon av avvikende foretaksdata», «Foretaket er ikke registrert i MVA-registeret») fremfor ærekrenkende bastante påstander. Dette minimerer juridisk eksponering og gir forbrukeren veiledende innsikt.
