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
                   │ Firebase Cloud Functions v2 (Node)│
                   │  - Rate Limiter (15 req/min/IP)   │
                   │  - Firebase App Check-validering  │
                   │  - Zod Request Payload Validator  │
                   │  - Restriktiv CORS Policy         │
                   │  - Secrets via Secret Manager     │
                   │  - Orchestrator Service           │
                   └───────┬──────────┬───────────┬────┘
                           │          │           │
            ┌──────────────┘          │           └──────────────┐
            ▼                         ▼                          ▼
┌───────────────────────┐ ┌───────────────────────┐ ┌─────────────────────────┐
│ Gemini 2.5 / Vision   │ │ Brønnøysundregistrene │ │ Domene- & Sikkerhet     │
│ - Multimodal OCR      │ │ - Enhetsregisteret    │ │ - DNS / Toppdomener     │
│ - Merkevare-spoofing  │ │ - MVA & Stiftelsesdato│ │ - HTTPS / Sertifikat    │
│ - Selskapsprioritering│ │ - Konkurs & Avvikling │ │ - Varslingslisten       │
│ - Emballasjefilter    │ │ - Ansatte & Selskapsm.│ │ - Google & Trustpilot   │
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

## 🔒 Sikkerhetsarkitektur

Endepunktet `analyzeEntity` er herdet mot misbruk, overforbruk og uautorisert tilgang:

1. **Rate Limiting:**
   - Maksimum **15 forespørsler per minutt per klient-IP**.
   - Returnerer standard HTTP `429 Too Many Requests` med `Retry-After`-header ved overskridelse.
2. **Firebase App Check:**
   - Støtter validering av `X-Firebase-AppCheck`-header via Firebase Admin SDK.
   - For lokal utvikling og testing kjøres servicen permissivt som standard. I produksjon kan håndheving aktiveres med miljøvariabelen `ENFORCE_APP_CHECK=true`.
3. **Payload-validering (Zod):**
   - Base64-bilde: Maks 7 000 000 tegn (~5 MB råfil).
   - Tillatte MIME-typer: `image/jpeg` og `image/png`.
   - Søketekst (`query`): Maks 500 tegn.
   - Avviser feilformaterte eller for store payloads umiddelbart med HTTP `400 Bad Request` før eksterne API-er kontaktes.
4. **Secrets Management:**
   - Ingen API-nøkler er hardkodet i repoet.
   - Produksjonsnøkler bindes via Google Secret Manager i Firebase Functions v2 (`GEMINI_API_KEY`, `GOOGLE_VISION_API_KEY`).
5. **CORS:**
   - Native mobilapper (iOS og Android) sender ingen `Origin`-header og tillates direkte via native nettverkskall.
   - Web-klienter begrenses strengt til godkjente domener for å forhindre kryss-opprinnelses-misbruk (CSRF / scraping).
6. **Feilhåndtering og Informasjonsvern:**
   - Klienten mottar aldri interne stack traces, databasefeil eller API-feilmeldinger.
   - Fullstendige feildetaljer logges server-side med en unik `requestId` for feilsøking.
7. **Kostnads- og kvotebeskyttelse:**
   - Cloud Functions v2 er konfigurert med `maxInstances: 10` for å hindre uventet kostnadseskalering ved trafikktopper eller DDoS.
   - 60 sekunders timeout og 1 GiB minneallokering.

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
│   │   ├── middleware/
│   │   │   ├── app-check.middleware.ts    # Firebase App Check token-validering
│   │   │   ├── rate-limiter.middleware.ts # In-memory IP rate limiting
│   │   │   └── validation.middleware.ts   # Zod request-validering
│   │   ├── services/
│   │   │   ├── brreg.service.ts       # Sanntidsoppslag mot Brønnøysundregistrene
│   │   │   ├── domain.service.ts      # Domenealder, SSL, spoofing og DNS-validering
│   │   │   ├── gemini.service.ts      # Multimodal bildeanalyse og syntetisering
│   │   │   ├── reputation.service.ts  # Varslingslisten og svindelmønster-sjekk
│   │   │   ├── reviews.service.ts     # Google Reviews og Trustpilot-validering
│   │   │   └── orchestrator.service.ts# Samordning av alle datakilder
│   │   ├── types/
│   │   │   └── analysis.types.ts      # TypeScript-definisjoner for rapporter og data
│   │   ├── index.ts                   # Sikret hovedendepunkt (analyzeEntity)
│   │   └── security.test.ts           # Sikkerhetstester for validering, App Check og rate limiting
│   ├── .env.example                   # Eksempel på miljøvariabler for lokal emulator
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
│   │   │   └── api_service.dart       # API-klient mot backend (med robust ApiException)
│   │   ├── theme/
│   │   │   └── app_theme.dart         # Nordisk mørkt sikkerhetstema
│   │   └── main.dart                  # Hovedoppstart
│   └── pubspec.yaml
└── README.md
```

---

## 🚀 Kom i gang (Lokal kjøring)

### 1. Kjøre backend (Firebase Functions)
1. Gå inn i `functions`-mappen og installer avhengigheter:
   ```bash
   cd functions
   npm install
   ```
2. Opprett en lokal `.env`-fil basert på `.env.example`:
   ```bash
   cp .env.example .env
   ```
   Legg inn din Google Cloud / Gemini API-nøkkel:
   ```env
   GEMINI_API_KEY=ditt_api_key_her
   GOOGLE_VISION_API_KEY=ditt_api_key_her
   ENFORCE_APP_CHECK=false
   ```
3. Kjør tester og bygg funksjonen:
   ```bash
   npm test
   ```
4. Start funksjonene med Firebase Emulator:
   ```bash
   npm run serve
   ```
   *Endepunktet blir tilgjengelig på `http://localhost:5001/<prosjekt-id>/us-central1/analyzeEntity`.*

---

### 2. Kjøre mobilappen (Flutter)
1. Gå inn i `mobile`-mappen:
   ```bash
   cd mobile
   ```
2. Sjekk kodekvalitet:
   ```bash
   flutter analyze
   ```
3. Start appen på tilkoblet enhet eller emulator:
   ```bash
   flutter run
   ```
   *Merk: Dersom backend er utilgjengelig eller enheten mangler nettverk, gis det nå en tydelig og ærlig feilmelding i brukergrensesnittet i stedet for falske analyser.*

---

## ☁️ Produksjon & Secrets Management

### Registrering av Secrets i Google Secret Manager
Produksjonsnøkler skal **ikke** commites eller legges i `.env` i produksjon. Sett dem sikkert via Firebase CLI:
```bash
firebase functions:secrets:set GEMINI_API_KEY
firebase functions:secrets:set GOOGLE_VISION_API_KEY
```

### Aktivering av Firebase App Check i produksjon
1. Registrer din Android-app (Play Integrity / SHA-256) og iOS-app (DeviceCheck / App Attest) i Firebase Console under **App Check**.
2. Sett miljøvariabelen `ENFORCE_APP_CHECK=true` i produksjon:
   ```bash
   firebase functions:config:set security.enforce_app_check="true"
   # eller i produksjonsmiljøet
   ```

### Anbefalt budsjettalarm og kostnadskontroll
1. Sett opp en **Budget Alert** i [Google Cloud Billing Console](https://console.cloud.google.com/billing):
   - Opprett et månedlig budsjett (f.eks. 200–500 NOK).
   - Sett varsler ved 50 %, 90 % og 100 % forbruk via e-post.
2. Cloud Functions er forhåndskonfigurert med `maxInstances: 10` for å forhindre kostnadsspiraler.

---

## ⚖️ Juridisk utforming & Forbrukervern
Vurderingene og tekstene som produseres av systemet er designet for å være **nøytrale og etterrettelige risikovurderinger** («Observasjon av avvikende foretaksdata», «Foretaket er ikke registrert i MVA-registeret») fremfor bastante eller ærekrenkende påstander. Dette minimerer juridisk eksponering og gir forbrukeren veiledende innsikt.
