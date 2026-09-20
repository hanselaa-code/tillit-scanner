/**
 * NLP Text Similarity & Anomaly Engine for Reviews
 * 
 * Beregner n-gram likhet, Jaccard-koeffisient og oppdager unaturlig ensartede
 * setningsstrukturer eller repeterende salgsfraser på tvers av brukeranmeldelser.
 */

export class NlpSimilarityUtil {
  /**
   * Renser og normaliserer tekst til ord-tokens.
   */
  public static tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\wæøå0-9\s]/gi, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 1);
  }

  /**
   * Genererer N-grams (f.eks. bigrams eller trigrams) fra tekst.
   */
  public static generateNgrams(tokens: string[], n: number = 3): Set<string> {
    const ngrams = new Set<string>();
    if (tokens.length < n) {
      if (tokens.length > 0) ngrams.add(tokens.join(' '));
      return ngrams;
    }
    for (let i = 0; i <= tokens.length - n; i++) {
      ngrams.add(tokens.slice(i, i + n).join(' '));
    }
    return ngrams;
  }

  /**
   * Jaccard Similarity mellom to sett: |A ∩ B| / |A ∪ B|
   */
  public static jaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
    if (setA.size === 0 && setB.size === 0) return 1.0;
    if (setA.size === 0 || setB.size === 0) return 0.0;

    let intersectionCount = 0;
    for (const item of setA) {
      if (setB.has(item)) {
        intersectionCount++;
      }
    }

    const unionCount = setA.size + setB.size - intersectionCount;
    return unionCount === 0 ? 0 : intersectionCount / unionCount;
  }

  /**
   * Sammenligner to anmeldelsestekster og returnerer likhetsscore (0.0 - 1.0).
   */
  public static compareReviews(textA: string, textB: string): number {
    const tokensA = this.tokenize(textA);
    const tokensB = this.tokenize(textB);

    const bigramsA = this.generateNgrams(tokensA, 2);
    const bigramsB = this.generateNgrams(tokensB, 2);
    const trigramsA = this.generateNgrams(tokensA, 3);
    const trigramsB = this.generateNgrams(tokensB, 3);

    const bigramSim = this.jaccardSimilarity(bigramsA, bigramsB);
    const trigramSim = this.jaccardSimilarity(trigramsA, trigramsB);

    // Vektet kombinasjon av 2-gram og 3-gram likhet
    return 0.4 * bigramSim + 0.6 * trigramSim;
  }

  /**
   * Skanner et sett med anmeldelser for likhetsanomalier.
   */
  public static detectAnomalies(reviews: string[]): {
    detected: boolean;
    highestSimilarity: number;
    sampleA?: string;
    sampleB?: string;
  } {
    if (reviews.length < 2) {
      return { detected: false, highestSimilarity: 0 };
    }

    let highestSimilarity = 0;
    let sampleA: string | undefined;
    let sampleB: string | undefined;

    for (let i = 0; i < reviews.length; i++) {
      for (let j = i + 1; j < reviews.length; j++) {
        const sim = this.compareReviews(reviews[i], reviews[j]);
        if (sim > highestSimilarity) {
          highestSimilarity = sim;
          sampleA = reviews[i];
          sampleB = reviews[j];
        }
      }
    }

    // Likhet over 55% mellom to uavhengige anmeldelser er en signifikant språklig anomali
    const detected = highestSimilarity >= 0.55;

    return {
      detected,
      highestSimilarity: Math.round(highestSimilarity * 100) / 100,
      sampleA: detected ? sampleA : undefined,
      sampleB: detected ? sampleB : undefined,
    };
  }
}
