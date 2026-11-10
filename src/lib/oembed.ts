/**
 * oEmbed fetcher — runs client-side from the mobile app.
 *
 * Mobile IPs are generally not blocked by social platforms, unlike datacenter IPs.
 * Fetches caption and thumbnail directly from oEmbed endpoints or by scraping
 * og:* meta tags from the page HTML.
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

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)));
}

/**
 * Scrape og:description and og:image from a page's HTML.
 * Works for TikTok and Instagram when fetched from a mobile IP.
 */
async function scrapeMetaTags(url: string): Promise<OEmbedResult> {
  try {
    const res = await fetchWithTimeout(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });
    if (!res.ok) return EMPTY;

    const html = await res.text();

    // Extract caption from og:description or twitter:description
    const descMatch =
      html.match(/<meta\s+(?:property|name)="(?:og:description|twitter:description)"\s+content="([^"]*)"/) ||
      html.match(/content="([^"]*)"[^>]*(?:property|name)="(?:og:description|twitter:description)"/);
    const caption = descMatch ? decodeHtmlEntities(descMatch[1]) : null;

    // Extract thumbnail from og:image
    const imageMatch =
      html.match(/<meta\s+(?:property|name)="og:image"\s+content="([^"]*)"/) ||
      html.match(/content="([^"]*)"[^>]*(?:property|name)="og:image"/);
    const thumbnailUrl = imageMatch ? imageMatch[1] : null;

    return { caption, thumbnailUrl };
  } catch {
    return EMPTY;
  }
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
 * - Instagram/TikTok: DISABLED — these platforms don't serve og:* tags to
 *   mobile user agents, so scraping returns nothing. The 5s timeout was
 *   wasted on every save. Caption must come from the share intent text instead.
 * - Threads: Never supported
 */
export async function fetchOEmbed(url: string, platform: Platform | null): Promise<OEmbedResult> {
  switch (platform) {
    case 'x':
      return fetchTwitter(url);
    // Instagram/TikTok scraping disabled — returns empty after 5s timeout.
    // Caption extraction from share intent text is handled in save-post/form.tsx.
    case 'tiktok':
    case 'instagram':
    default:
      return EMPTY;
  }
}
