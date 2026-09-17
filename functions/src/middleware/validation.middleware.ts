import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

// Maks 7MB tegn for base64 (~5MB rådata)
const MAX_BASE64_LENGTH = 7 * 1024 * 1024;
const MAX_QUERY_LENGTH = 500;

export const analyzeRequestSchema = z
  .object({
    image: z
      .string()
      .max(MAX_BASE64_LENGTH, 'Bildet er for stort. Maksimal tillatt størrelse er ca. 5 MB.')
      .refine(
        (val) => {
          const clean = val.replace(/^data:image\/\w+;base64,/, '');
          return clean.length > 0 && /^[A-Za-z0-9+/=]+$/.test(clean.substring(0, 100));
        },
        { message: 'Ugyldig bildeformat. Bildet må overføres som base64-streng.' }
      )
      .optional(),
    mimeType: z
      .enum(['image/jpeg', 'image/png'], {
        errorMap: () => ({
          message: 'Ugyldig MIME-type. Kun image/jpeg og image/png er støttet.',
        }),
      })
      .optional(),
    query: z
      .string()
      .max(MAX_QUERY_LENGTH, `Søkeordet er for langt. Maksimal lengde er ${MAX_QUERY_LENGTH} tegn.`)
      .transform((val) => val.trim())
      .optional(),
  })
  .refine(
    (data) => Boolean((data.image && data.image.length > 0) || (data.query && data.query.length > 0)),
    {
      message: 'Forespørselen må inneholde enten et bilde («image») eller et søkeord («query»).',
      path: ['query'],
    }
  );

export type ValidatedAnalyzeRequest = z.infer<typeof analyzeRequestSchema>;

/**
 * Express middleware for validering av analyse-payload.
 */
export function validateAnalyzeRequest(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const result = analyzeRequestSchema.safeParse(req.body);

  if (!result.success) {
    const errorMessages = result.error.errors.map((e) => e.message);
    res.status(400).json({
      error: 'Ugyldig forespørsel',
      message: errorMessages.join('; '),
      details: result.error.flatten(),
    });
    return;
  }

  // Erstatt req.body med den vaskede og validerte versjonen
  req.body = result.data;
  next();
}
