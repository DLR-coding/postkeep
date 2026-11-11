/**
 * oEmbed fetcher — runs client-side from the mobile app.
 *
 * Only X/Twitter still answers oEmbed with the post text. Instagram and TikTok go
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

/**
 * Fetches oEmbed metadata for the given URL and platform.
 *
 * Platform support as of November 2026:
 * - X/Twitter: oEmbed API works, returns tweet text (no thumbnail)
 * - Instagram/TikTok: handled by the hidden WebView (`src/lib/webview-metadata.tsx`),
 *   not here.
 * - Threads: Never supported
 */
export async function fetchOEmbed(url: string, platform: Platform | null): Promise<OEmbedResult> {
  switch (platform) {
    case 'x':
      return fetchTwitter(url);
    // Instagram/TikTok : WebView cachée, et repli sur le texte partagé
    // (`extractCaptionFromText`), tous deux appelés par save-post/form.tsx.
    default:
      return EMPTY;
  }
}
