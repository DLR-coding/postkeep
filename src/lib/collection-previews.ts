/**
 * Aperçu d'un dossier de l'écran Collections (refonte, tâche 3) : miniatures
 * des posts récents et plateforme dominante. Logique pure, testée par
 * `collection-previews.test.ts` ; la requête SQL est dans `src/db/collections.ts`.
 */

import { detectPlatform, type Platform } from './share-url.ts';

/** Clé du pseudo-dossier « Uncategorized » (aucune ligne en base). */
export const UNCATEGORIZED_KEY = 'none';

export type PreviewRow = {
  collectionId: string | null;
  postId: string;
  url: string | null;
  thumbnailUrl: string | null;
  updatedAt: Date;
};

export type CollectionPreview = { thumbnails: string[]; platform: Platform | null };

const MAX_THUMBNAILS = 3;

export function buildCollectionPreviews(rows: PreviewRow[]): Map<string, CollectionPreview> {
  // Une ligne sans collection pour un post qui a aussi une collection active vient d'une
  // collection supprimée : le post n'est pas « sans collection ».
  const filed = new Set(rows.filter((r) => r.collectionId).map((r) => r.postId));
  const byCollection = new Map<string, PreviewRow[]>();
  for (const row of rows) {
    if (!row.collectionId && filed.has(row.postId)) continue;
    const key = row.collectionId ?? UNCATEGORIZED_KEY;
    byCollection.set(key, [...(byCollection.get(key) ?? []), row]);
  }

  const previews = new Map<string, CollectionPreview>();
  for (const [key, group] of byCollection) {
    const recentFirst = [...group].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

    const thumbnails = [
      ...new Set(recentFirst.map((r) => r.thumbnailUrl).filter((t): t is string => !!t)),
    ].slice(0, MAX_THUMBNAILS);

    // Map garde l'ordre d'insertion : à égalité, le `>` strict laisse la
    // plateforme du post le plus récent (vue en premier).
    const counts = new Map<Platform, number>();
    for (const r of recentFirst) {
      const platform = r.url ? detectPlatform(r.url) : null;
      if (platform) counts.set(platform, (counts.get(platform) ?? 0) + 1);
    }
    let platform: Platform | null = null;
    let best = 0;
    for (const [candidate, count] of counts) {
      if (count > best) {
        platform = candidate;
        best = count;
      }
    }

    previews.set(key, { thumbnails, platform });
  }
  return previews;
}
