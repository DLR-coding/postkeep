/**
 * Filtre par plateforme, recherche et surlignage des posts (refonte, tâche 2).
 * Logique pure, testée par `post-filters.test.ts` — les écrans All posts et
 * Collections s'en servent avec le texte tapé dans la barre du bas.
 */

import { detectPlatform } from './share-url.ts';

export type PlatformFilter = 'all' | 'instagram' | 'tiktok' | 'x';

export type SearchablePost = { url: string | null; caption: string | null; note: string | null };

export type HighlightSegment = { text: string; match: boolean };

/** Plie un texte pour la comparaison (casse et accents ignorés) en gardant
 *  exactement un caractère par caractère d'origine : les indices trouvés dans
 *  la version pliée valent pour le texte d'origine (surlignage). */
function fold(text: string): string {
  return Array.from(text, (char) => {
    const folded = char.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
    // Rare cas où le pliage change la longueur (« İ » → 2 caractères) : on garde
    // le caractère tel quel plutôt que de décaler tous les indices suivants.
    return folded.length === 1 ? folded : char;
  }).join('');
}

export function matchesText(text: string, query: string): boolean {
  const needle = fold(query.trim());
  return needle.length > 0 && fold(text).includes(needle);
}

export function splitHighlight(text: string, query: string): HighlightSegment[] {
  const needle = fold(query.trim());
  if (!needle) return [{ text, match: false }];

  // `Array.from` pour travailler en caractères, comme `fold` (emoji, etc.).
  const chars = Array.from(text);
  const haystack = fold(text);
  const foldedChars = Array.from(haystack);
  const needleLength = Array.from(needle).length;
  const segments: HighlightSegment[] = [];
  let start = 0;
  let i = 0;
  while (i <= foldedChars.length - needleLength) {
    if (foldedChars.slice(i, i + needleLength).join('') === needle) {
      if (i > start) segments.push({ text: chars.slice(start, i).join(''), match: false });
      segments.push({ text: chars.slice(i, i + needleLength).join(''), match: true });
      i += needleLength;
      start = i;
    } else {
      i += 1;
    }
  }
  if (start < chars.length) segments.push({ text: chars.slice(start).join(''), match: false });
  return segments;
}

export function filterPosts<T extends SearchablePost>(
  posts: T[],
  opts: { platform: PlatformFilter; query: string }
): T[] {
  const query = opts.query.trim();
  return posts.filter((post) => {
    if (opts.platform !== 'all' && (!post.url || detectPlatform(post.url) !== opts.platform)) {
      return false;
    }
    if (!query) return true;
    return [post.caption, post.note, post.url].some((field) => !!field && matchesText(field, query));
  });
}

export function filterCollectionsByName<T extends { name: string }>(items: T[], query: string): T[] {
  return query.trim() ? items.filter((item) => matchesText(item.name, query)) : items;
}
