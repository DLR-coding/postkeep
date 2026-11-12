/**
 * Rattrapage des métadonnées : logique pure (sélection et compteur d'essais).
 * Le déclenchement vit dans `src/components/metadata-backfill.tsx`.
 */
import { detectPlatform } from './share-url.ts';

/** Au-delà, l'image n'existe probablement plus (post supprimé ou privé). */
export const MAX_ATTEMPTS = 3;

export type Attempts = Record<string, number>;

type MissingPost = { id: string; url: string };

export function parseAttempts(raw: string | null): Attempts {
  try {
    const value: unknown = raw ? JSON.parse(raw) : {};
    return value && typeof value === 'object' && !Array.isArray(value) ? (value as Attempts) : {};
  } catch {
    return {};
  }
}

/**
 * `missing` : posts actifs sans miniature. Renvoie les posts Instagram/TikTok encore à
 * essayer, et le compteur réduit à ces posts (ceux qui ont retrouvé une miniature ou
 * ont été supprimés en sortent).
 */
export function pickBackfill(
  missing: MissingPost[],
  attempts: Attempts
): { candidates: MissingPost[]; attempts: Attempts } {
  const extractable = missing.filter((post) => {
    const platform = detectPlatform(post.url);
    return platform === 'instagram' || platform === 'tiktok';
  });
  return {
    candidates: extractable.filter((post) => (attempts[post.id] ?? 0) < MAX_ATTEMPTS),
    attempts: Object.fromEntries(
      extractable.filter((post) => post.id in attempts).map((post) => [post.id, attempts[post.id]])
    ),
  };
}
