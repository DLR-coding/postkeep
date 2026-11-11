/**
 * oEmbed fetcher — runs client-side from the mobile app.
 *
 * X/Twitter and Reddit answer oEmbed with the post text (Reddit: title only). Instagram and TikTok go
 * through the hidden WebView (`src/lib/webview-metadata.tsx`); scraping og:* tags
 * with `fetch` was dropped because those pages no longer serve them.
 */

import type { Platform } from './share-url';

export type OEmbedResult = {
  caption: string | null;
  thumbnailUrl: string | null;
};

const EMPTY: OEmbedResult = { caption: null, thumbnailUrl: null };

// `fetch` n'a pas de délai par défaut en React Native : sans ça, un réseau qui
// ne répond pas bloque le bouton « Saving... » indéfiniment.
const TIMEOUT_MS = 5000;

function fetchWithTimeout(input: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  return fetch(input, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer));
}

/**
 * X/Twitter oEmbed — returns tweet text in an HTML blockquote.
 * Uses the legacy API endpoint which still works as of November 2026.
 */
async function fetchTwitter(url: string): Promise<OEmbedResult> {
  try {
    const res = await fetchWithTimeout(
      `https://api.twitter.com/1/statuses/oembed.json?url=${encodeURIComponent(url)}`
    );
    if (!res.ok) return EMPTY;

    const data = await res.json();
    const match = data.html?.match(/<p[^>]*>([\s\S]*?)<\/p>/);
    const rawText = match ? match[1] : null;
    const caption = rawText
      ? rawText
          .replace(/<[^>]+>/g, '')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .trim()
      : null;
    return { caption, thumbnailUrl: null };
  } catch {
    return EMPTY;
  }
}

/** Réponse de l'oEmbed officiel de Reddit : légende = titre du post. Pas de miniature
 *  (l'oEmbed n'en donne pas). Le `.json` public des posts, qui en a une, renvoie 403 même
 *  depuis le réseau du téléphone (vérifié le 11 novembre 2026). */
export function parseRedditOEmbed(json: unknown): OEmbedResult {
  const title = (json as { title?: unknown } | null)?.title;
  return { caption: typeof title === 'string' && title.trim() ? title.trim() : null, thumbnailUrl: null };
}

async function fetchReddit(url: string): Promise<OEmbedResult> {
  try {
    // Reddit demande aux clients de s'identifier ; 403/429 → vide.
    const res = await fetchWithTimeout(`https://www.reddit.com/oembed?url=${encodeURIComponent(url)}`, {
      headers: { 'User-Agent': 'PostKeep/0.3 (Android app)' },
    });
    if (!res.ok) return EMPTY;
    return parseRedditOEmbed(await res.json());
  } catch {
    return EMPTY;
  }
}

/**
 * Fetches oEmbed metadata for the given URL and platform.
 *
 * Platform support as of November 2026:
 * - X/Twitter: oEmbed API works, returns tweet text (no thumbnail)
 * - Reddit: official oEmbed (`reddit.com/oembed`), post title only (no thumbnail)
 * - Instagram/TikTok: handled by the hidden WebView (`src/lib/webview-metadata.tsx`),
 *   not here.
 * - Threads: Never supported
 */
export async function fetchOEmbed(url: string, platform: Platform | null): Promise<OEmbedResult> {
  switch (platform) {
    case 'x':
      return fetchTwitter(url);
    case 'reddit':
      return fetchReddit(url);
    // Instagram/TikTok : WebView cachée, et repli sur le texte partagé
    // (`extractCaptionFromText`), tous deux appelés par save-post/form.tsx.
    default:
      return EMPTY;
  }
}
