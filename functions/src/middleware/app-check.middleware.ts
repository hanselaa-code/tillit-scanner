import { Request, Response, NextFunction } from 'express';
import * as admin from 'firebase-admin';

export interface AppCheckVerificationResult {
  verified: boolean;
  appId?: string;
  error?: string;
}

/**
 * Verifiserer Firebase App Check-token.
 *
 * For lokal utvikling og testing:
 * Hvis miljøvariabelen ENFORCE_APP_CHECK ikke er satt til 'true',
 * vil forespørsler uten gyldig token tillates, men logges.
 * Dette sikrer at emulatorer, curl og Flutter-dev ikke låses ute.
 */
export async function verifyAppCheckToken(token?: string): Promise<AppCheckVerificationResult> {
  if (!token) {
    return { verified: false, error: 'Mangler X-Firebase-AppCheck header' };
  }

  try {
    const appCheckClaims = await admin.appCheck().verifyToken(token);
    return {
      verified: true,
      appId: appCheckClaims.appId,
    };
  } catch (err: any) {
    return {
      verified: false,
      error: err.message || 'Kunne ikke verifisere App Check-token',
    };
  }
}

export function appCheckMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const enforceAppCheck = process.env.ENFORCE_APP_CHECK === 'true';
  const rawHeader = req.headers['x-firebase-appcheck'];
  const appCheckToken = typeof rawHeader === 'string' ? rawHeader : undefined;

  // I dev-modus: hvis token mangler eller ikke er håndhevet, la gå gjennom
  if (!enforceAppCheck) {
    if (appCheckToken) {
      verifyAppCheckToken(appCheckToken).then((result) => {
        if (!result.verified) {
          console.warn('[AppCheck (Permissiv)] Token ble sendt, men validering feilet:', result.error);
        } else {
          console.info(`[AppCheck (Permissiv)] Gyldig token for appId: ${result.appId}`);
        }
      });
    } else {
      // Ingen token, men håndheving er avskrudd
    }
    next();
    return;
  }

  // I produksjonsmodus med ENFORCE_APP_CHECK=true
  if (!appCheckToken) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Forespørselen mangler påkrevd App Check-sikkerhetstoken.',
    });
    return;
  }

  verifyAppCheckToken(appCheckToken)
    .then((result) => {
      if (!result.verified) {
        console.warn('[AppCheck] Avvist uautorisert forespørsel:', result.error);
        res.status(401).json({
          error: 'Unauthorized',
          message: 'Ugyldig eller utløpt App Check-token.',
        });
        return;
      }

      console.info(`[AppCheck] Godkjent forespørsel fra app: ${result.appId}`);
      next();
    })
    .catch((err) => {
      console.error('[AppCheck] Uventet feil under token-validering:', err);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Feil ved validering av app-sikkerhet.',
      });
    });
}
