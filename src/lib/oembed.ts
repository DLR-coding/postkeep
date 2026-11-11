/**
 * oEmbed fetcher — runs client-side from the mobile app.
 *
 * X/Twitter answers oEmbed with the post text; Reddit through the post's RSS feed or oEmbed. Instagram and TikTok go
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

/** Réponse de l'oEmbed officiel de Reddit : légende = titre du post, pas de miniature. */
export function parseRedditOEmbed(json: unknown): OEmbedResult {
  const title = (json as { title?: unknown } | null)?.title;
  return { caption: typeof title === 'string' && title.trim() ? title.trim() : null, thumbnailUrl: null };
}

/** Flux RSS (Atom) d'un post Reddit, format public officiel : `<entry><title>` = titre du
 *  post, `<media:thumbnail url>` = miniature. Le `<title>` du flux (« … : sub ») précède
 *  l'entrée, d'où la recherche après `<entry>`. */
export function parseRedditRss(xml: string): OEmbedResult {
  const at = xml.indexOf('<entry>');
  if (at < 0) return EMPTY;
  const entry = xml.slice(at);
  const title = entry.match(/<title>([^<]*)<\/title>/)?.[1];
  const thumb = entry.match(/<media:thumbnail url="([^"]+)"/)?.[1];
  return {
    caption: title?.trim() ? decodeXml(title.trim()) : null,
    thumbnailUrl: thumb ? decodeXml(thumb) : null,
  };
}

function decodeXml(text: string): string {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

// Reddit demande aux clients de s'identifier ; tout refus (403/429) → vide.
const REDDIT_HEADERS = { 'User-Agent': 'PostKeep/0.3 (Android app)' };

async function fetchRedditRss(url: string): Promise<OEmbedResult> {
  // Seul un permalien de post (`/comments/`) a un flux à lui ; `redd.it` et `/s/` non.
  if (!/\/comments\//.test(url)) return EMPTY;
  try {
    const res = await fetchWithTimeout(`${url.replace(/\/?$/, '/')}.rss`, { headers: REDDIT_HEADERS });
    return res.ok ? parseRedditRss(await res.text()) : EMPTY;
  } catch {
    return EMPTY;
  }
}

async function fetchRedditOEmbed(url: string): Promise<OEmbedResult> {
  try {
    const res = await fetchWithTimeout(`https://www.reddit.com/oembed?url=${encodeURIComponent(url)}`, {
      headers: REDDIT_HEADERS,
    });
    return res.ok ? parseRedditOEmbed(await res.json()) : EMPTY;
  } catch {
    return EMPTY;
  }
}

/** RSS du post (titre + miniature) ; si rien, oEmbed officiel (titre seul, accepte aussi
 *  les liens courts). Le `.json` public répond 403 même en réseau mobile, et la page HTML
 *  est derrière une vérification anti-bot : ni l'un ni l'autre n'est utilisé. */
async function fetchReddit(url: string): Promise<OEmbedResult> {
  const rss = await fetchRedditRss(url);
  if (rss.caption || rss.thumbnailUrl) return rss;
  return fetchRedditOEmbed(url);
}

/**
 * Fetches oEmbed metadata for the given URL and platform.
 *
 * Platform support as of November 2026:
 * - X/Twitter: oEmbed API works, returns tweet text (no thumbnail)
 * - Reddit: the post's RSS feed (title + thumbnail), else official oEmbed (title only)
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
