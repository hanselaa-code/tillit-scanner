import axios from 'axios';
import {
  ReviewsCheckResult,
  GoogleReviewInfo,
  GoogleReviewSnippet,
  TrustpilotInfo,
} from '../types/analysis.types';

export class ReviewsService {
  private apiKey: string;

  constructor() {
    this.apiKey =
      process.env.GOOGLE_VISION_API_KEY ||
      process.env.GEMINI_API_KEY ||
      'AIzaSyCHWjIZ4ik8UzIW7fwzuBXRID3BA_Tqz14';
  }

  public async checkReviews(
    query: string,
    domainCandidate?: string,
    brandCandidate?: string
  ): Promise<ReviewsCheckResult> {
    const cleanDomain = this.extractCleanDomain(domainCandidate || (this.looksLikeUrl(query) ? query : ''));
    const trustpilot: TrustpilotInfo | undefined = cleanDomain
      ? {
          domain: cleanDomain,
          url: `https://no.trustpilot.com/review/${cleanDomain}`,
        }
      : undefined;

    let google: GoogleReviewInfo | undefined;
    const warningFlags: string[] = [];
    const positiveFlags: string[] = [];

    // Prioriter søkefrase for Google Places: Rent domenenavn > Merkenavn > Søkeord
    const searchPhrase = this.pickBestSearchPhrase(query, brandCandidate, cleanDomain);

    if (this.apiKey && searchPhrase) {
      try {
        google = await this.queryGooglePlaces(searchPhrase, cleanDomain);
      } catch (err: any) {
        console.warn('Google Places API feilet under anmeldelsesoppslag:', err.message);
      }
    }

    if (google?.found && google.rating !== undefined) {
      const rating = google.rating;
      const count = google.userRatingCount || 0;

      if (rating < 2.5 && count >= 5) {
        warningFlags.push(
          `Kritisk lav kundevurdering på Google: ${rating} / 5 stjerner (${count} anmeldelser).`
        );
      } else if (rating < 3.5 && count >= 5) {
        warningFlags.push(
          `Under middels kundevurdering på Google: ${rating} / 5 stjerner (${count} anmeldelser).`
        );
      } else if (rating >= 4.0 && count >= 10) {
        positiveFlags.push(
          `Meget gode kundeanmeldelser på Google: ${rating} / 5 stjerner (${count} verifiserte anmeldelser).`
        );
      }
    }

    let summary = '';
    if (google?.found && google.rating !== undefined) {
      summary = `Fant Google-oppføring for «${google.placeName || searchPhrase}» med ${google.rating} av 5 stjerner (${google.userRatingCount || 0} anmeldelser).`;
    } else if (cleanDomain) {
      summary = `Ingen Google Places-oppføring funnet for «${searchPhrase}». Trustpilot-sjekk anbefales.`;
    }

    return {
      google,
      trustpilot,
      summary,
      warningFlags,
      positiveFlags,
    };
  }

  private pickBestSearchPhrase(
    query: string,
    brandCandidate?: string,
    cleanDomain?: string
  ): string {
    if (cleanDomain) {
      return cleanDomain;
    }
    if (brandCandidate && brandCandidate.trim().length > 1) {
      return brandCandidate.trim();
    }
    return query.trim();
  }

  private extractCleanDomain(rawUrl: string): string {
    if (!rawUrl) return '';
    try {
      const cleaned = rawUrl
        .replace(/^https?:\/\//i, '')
        .replace(/^www\./i, '')
        .split('/')[0]
        .split('?')[0]
        .trim()
        .toLowerCase();
      return cleaned;
    } catch {
      return '';
    }
  }

  private looksLikeUrl(text: string): boolean {
    return /^https?:\/\//i.test(text) || /\.[a-z]{2,}(\/|$)/i.test(text);
  }

  private async queryGooglePlaces(textQuery: string, fallbackDomain?: string): Promise<GoogleReviewInfo> {
    const url = 'https://places.googleapis.com/v1/places:searchText';
    
    // Prøv først primærsøket med regionCode: 'NO'
    let places = await this.doPlacesPost(url, textQuery);

    // Hvis ingen treff og vi har et fallback-domene eller merkenavn, prøv fallback
    if ((!places || places.length === 0) && fallbackDomain && fallbackDomain !== textQuery) {
      places = await this.doPlacesPost(url, fallbackDomain);
    }
    if ((!places || places.length === 0) && !textQuery.toLowerCase().includes('norge')) {
      places = await this.doPlacesPost(url, `${textQuery} Norge`);
    }

    if (!places || places.length === 0) {
      return { found: false };
    }

    const first = places[0];
    const recentReviews: GoogleReviewSnippet[] = (first.reviews || []).slice(0, 3).map((r: any) => ({
      authorName: r.authorAttribution?.displayName,
      rating: r.rating,
      relativePublishTimeDescription: r.relativePublishTimeDescription,
      text: r.text?.text,
    }));

    return {
      found: true,
      placeName: first.displayName?.text,
      rating: first.rating,
      userRatingCount: first.userRatingCount,
      formattedAddress: first.formattedAddress,
      googleMapsUri: first.googleMapsUri,
      recentReviews,
    };
  }

  private async doPlacesPost(url: string, textQuery: string): Promise<any[]> {
    try {
      const response = await axios.post(
        url,
        {
          textQuery,
          languageCode: 'no',
          regionCode: 'NO',
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': this.apiKey,
            'X-Goog-FieldMask':
              'places.displayName,places.rating,places.userRatingCount,places.formattedAddress,places.websiteUri,places.googleMapsUri,places.reviews',
          },
          timeout: 8000,
        }
      );
      return response.data?.places || [];
    } catch {
      return [];
    }
  }
}

