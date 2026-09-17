import * as dotenv from 'dotenv';
dotenv.config();

import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import * as admin from 'firebase-admin';
import cors from 'cors';
import { randomUUID } from 'crypto';
import { OrchestratorService } from './services/orchestrator.service';
import { validateAnalyzeRequest, ValidatedAnalyzeRequest } from './middleware/validation.middleware';
import { rateLimiterMiddleware } from './middleware/rate-limiter.middleware';
import { appCheckMiddleware } from './middleware/app-check.middleware';

// Initialiser Firebase Admin hvis det trengs
if (!admin.apps.length) {
  admin.initializeApp();
}

// Definer produksjons-secrets fra Google Secret Manager
export const geminiApiKey = defineSecret('GEMINI_API_KEY');
export const googleVisionApiKey = defineSecret('GOOGLE_VISION_API_KEY');

// Restriktiv CORS-konfigurasjon:
// Native mobilapper (iOS/Android) sender ingen Origin-header og tillates direkte.
// Web-klienter begrenses til godkjente domener for å forhindre kryss-opprinnelses-misbruk.
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5000',
  'http://localhost:8080',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5000',
  'http://127.0.0.1:8080',
];

const corsHandler = cors({
  origin: (origin, callback) => {
    // Tillat native mobilapper som ikke sender Origin-header
    if (!origin) {
      return callback(null, true);
    }
    // Tillat godkjente web-domener
    if (
      allowedOrigins.includes(origin) ||
      origin.endsWith('.firebaseapp.com') ||
      origin.endsWith('.web.app')
    ) {
      return callback(null, true);
    }
    return callback(new Error('Ikke tillatt av CORS-sikkerhetspolicy'));
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Firebase-AppCheck',
    'X-Requested-With',
  ],
  maxAge: 86400,
});

let _orchestrator: OrchestratorService | null = null;
function getOrchestrator(): OrchestratorService {
  if (!_orchestrator) {
    _orchestrator = new OrchestratorService();
  }
  return _orchestrator;
}

/**
 * Sikret hovedendepunkt for multimodal analyse.
 * Inkluderer:
 * - Rate limiting (15 kall/min per IP)
 * - Firebase App Check-støtte
 * - Zod request-validering (maks 5MB bilde, kun JPEG/PNG, maks 500 tegn query)
 * - Restriktiv CORS
 * - Trygg feilhåndtering uten informasjonslekkasje
 * - Kostnadsvern (maks 10 samtidige instanser, 60s timeout)
 */
export const analyzeEntity = onRequest(
  {
    secrets: [geminiApiKey, googleVisionApiKey],
    cors: false,
    timeoutSeconds: 60,
    memory: '1GiB',
    maxInstances: 10,
  },
  (req, res) => {
    return corsHandler(req, res, () => {
      // 1. Health check / GET
      if (req.method === 'GET') {
        res.status(200).json({
          status: 'online',
          service: 'ScanSafe / Tillit Analysis Engine',
          version: '1.1.0-security',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // 2. Kun HTTP POST tillatt
      if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
        return;
      }

      // 3. Rate limiting per IP
      rateLimiterMiddleware()(req, res, () => {
        // 4. Firebase App Check-validering
        appCheckMiddleware(req, res, () => {
          // 5. Streng Zod request-validering
          validateAnalyzeRequest(req, res, async () => {
            const requestId = randomUUID();

            try {
              const body = req.body as ValidatedAnalyzeRequest;
              const report = await getOrchestrator().analyze(body);
              res.status(200).json(report);
            } catch (error: any) {
              // Logg feildetaljer server-side
              console.error(`[RequestId: ${requestId}] Kritisk feil under analyse:`, error);

              // Returner kun en trygg, ugjennomtrengelig feilmelding til klienten
              res.status(500).json({
                error: 'Internal Server Error',
                message: 'En intern feil oppsto under analysen. Vennligst prøv igjen senere.',
                requestId,
              });
            }
          });
        });
      });
    });
  }
);
