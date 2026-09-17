import * as dotenv from 'dotenv';
dotenv.config();

import { onRequest } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import cors from 'cors';
import { OrchestratorService } from './services/orchestrator.service';
import { AnalyzeRequest } from './types/analysis.types';

// Initialiser Firebase Admin hvis det trengs
if (!admin.apps.length) {
  admin.initializeApp();
}

const corsHandler = cors({ origin: true });
let _orchestrator: OrchestratorService | null = null;
function getOrchestrator(): OrchestratorService {
  if (!_orchestrator) {
    _orchestrator = new OrchestratorService();
  }
  return _orchestrator;
}

/**
 * Hovedendepunkt for analyse av bilde, URL eller firmanavn.
 * Støtter HTTP POST med JSON payload:
 * {
 *   "image": "base64...", // Valgfritt
 *   "mimeType": "image/jpeg", // Valgfritt
 *   "query": "firmanavn, orgnr eller nettadresse" // Valgfritt
 * }
 */
export const analyzeEntity = onRequest(
  {
    cors: true,
    timeoutSeconds: 60,
    memory: '1GiB',
  },
  async (req, res) => {
    return corsHandler(req, res, async () => {
      // Health check / GET
      if (req.method === 'GET') {
        res.status(200).json({
          status: 'online',
          service: 'ScanSafe / Tillit Analysis Engine',
          version: '1.0.0',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
        return;
      }

      try {
        const body = req.body as AnalyzeRequest;

        if (!body || (!body.image && !body.query)) {
          res.status(400).json({
            error: 'Ugyldig forespørsel. Du må oppgi enten et bilde (base64) eller et søkeord/URL i «query».',
          });
          return;
        }

        const report = await getOrchestrator().analyze(body);
        res.status(200).json(report);
      } catch (error: any) {
        console.error('Kritisk feil under analyse:', error);
        res.status(500).json({
          error: 'En intern feil oppsto under analysen.',
          details: error.message || 'Ukjent feil',
        });
      }
    });
  }
);
