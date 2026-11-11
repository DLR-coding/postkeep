/**
 * Filtre par plateforme, recherche et surlignage des posts (refonte, tâche 2).
 * Logique pure, testée par `post-filters.test.ts` — les écrans All posts et
 * Collections s'en servent avec le texte tapé dans la barre du bas.
 */

import { detectPlatform } from './share-url.ts';

export type PlatformFilter = 'all' | 'instagram' | 'tiktok' | 'x' | 'reddit';

export type SearchablePost = { url: string | null; caption: string | null; note: string | null };

export type HighlightSegment = { text: string; match: boolean };

/** Plie un texte pour la comparaison (casse et accents ignorés) et garde, pour chaque
 *  caractère plié, l'indice du caractère d'origine : le surlignage se fait sur le texte
 *  d'origine. Un accent combinant isolé (texte décomposé, NFD — fréquent depuis iOS) ne
 *  produit aucun caractère plié : « Le\u0301a » se compare comme « lea ». */
function fold(text: string): { chars: string[]; origin: number[]; source: string[] } {
  const source = Array.from(text);
  const chars: string[] = [];
  const origin: number[] = [];
  source.forEach((char, i) => {
    const folded = char.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
    for (const c of folded) {
      chars.push(c);
      origin.push(i);
    }
  });
  return { chars, origin, source };
}

function foldQuery(query: string): string {
  return fold(query.trim()).chars.join('');
}

export function matchesText(text: string, query: string): boolean {
  const needle = foldQuery(query);
  return needle.length > 0 && fold(text).chars.join('').includes(needle);
}

export function splitHighlight(text: string, query: string): HighlightSegment[] {
  const needle = Array.from(foldQuery(query));
  if (needle.length === 0) return [{ text, match: false }];

  const { chars, origin, source } = fold(text);
  const isMark = (char: string | undefined) => !!char && /^\p{M}+$/u.test(char);
  const segments: HighlightSegment[] = [];
  let cursor = 0; // indice dans `source` jusqu'où le texte est déjà découpé
  let i = 0;
  while (i <= chars.length - needle.length) {
    if (needle.every((c, k) => chars[i + k] === c)) {
      const start = origin[i];
      let end = origin[i + needle.length - 1] + 1;
      while (isMark(source[end])) end += 1; // accents combinants qui suivent la fin
      if (start > cursor) segments.push({ text: source.slice(cursor, start).join(''), match: false });
      segments.push({ text: source.slice(start, end).join(''), match: true });
      cursor = end;
      i += needle.length;
      while (i < chars.length && origin[i] < cursor) i += 1;
    } else {
      i += 1;
    }
  }
  if (cursor < source.length) segments.push({ text: source.slice(cursor).join(''), match: false });
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
