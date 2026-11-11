/**
 * Analyse d'une URL partagée (Phase 2, TODO.md). Logique pure, sans dépendance —
 * `expo-share-intent` a déjà isolé l'URL dans le texte partagé (voir `webUrl`),
 * ce module se charge de la normaliser et d'en déduire la plateforme.
 */

export type Platform = 'instagram' | 'tiktok' | 'x' | 'threads' | 'reddit';

const PLATFORM_HOSTS: Record<Platform, string[]> = {
  instagram: ['instagram.com'],
  tiktok: ['tiktok.com'],
  x: ['x.com', 'twitter.com'],
  threads: ['threads.net', 'threads.com'],
  reddit: ['reddit.com', 'redd.it'],
};

/** Aperçu de repli quand aucune miniature n'a pu être récupérée (ARCHITECTURE.md
 *  §6). En l'absence d'icône de marque dans les dépendances du projet, un badge
 *  coloré + libellé tient lieu de logo pour la V1. */
export const PLATFORM_META: Record<Platform, { label: string; badge: string; color: string }> = {
  instagram: { label: 'Instagram', badge: 'IG', color: '#E4405F' },
  tiktok: { label: 'TikTok', badge: 'TT', color: '#010101' },
  x: { label: 'X', badge: 'X', color: '#000000' },
  threads: { label: 'Threads', badge: 'TH', color: '#000000' },
  reddit: { label: 'Reddit', badge: 'R', color: '#FF4500' },
};

function isSameOrSubdomain(hostname: string, host: string): boolean {
  return hostname === host || hostname.endsWith(`.${host}`);
}

export function detectPlatform(url: string): Platform | null {
  let hostname: string;
  try {
    hostname = new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
  const entry = Object.entries(PLATFORM_HOSTS).find(([, hosts]) =>
    hosts.some((host) => isSameOrSubdomain(hostname, host))
  );
  return (entry?.[0] as Platform) ?? null;
}

/** Retire query et fragment pour les plateformes connues (ARCHITECTURE.md §4) —
 *  Instagram régénère `?igsh=…` à chaque partage, TikTok ajoute des paramètres de
 *  tracking, etc. Sans ça, deux partages du même post ne se ressemblent jamais.
 *  Pour les autres URLs (YouTube, articles, etc.), on garde la query car elle peut
 *  être essentielle (ex: `?v=VIDEO_ID` sur YouTube). */
export function normalizeUrl(url: string, platform: Platform | null): string | null {
  try {
    const parsed = new URL(url);
    // Ne supprimer la query que pour les plateformes où elle n'est que du tracking
    if (platform) {
      parsed.search = '';
    }
    parsed.hash = '';
    return parsed.toString();
  } catch {
    return null;
  }
}

/** TikTok et Reels Instagram sont des vidéos verticales 9:16 : vignette et cadre
 *  en 9:16 sans attendre de connaître la taille réelle de l'image. */
export function isVerticalVideo(url: string | null, platform: Platform | null): boolean {
  if (!url || !platform) return false;
  if (platform === 'tiktok') return true;
  return platform === 'instagram' && url.includes('/reel/');
}

export type AnalyzedUrl = {
  url: string;
  platform: Platform | null;
};

/**
 * Extract caption from the shared text by removing the URL.
 * Instagram/TikTok often send "Caption text\nhttps://..." or just the URL.
 * Returns null if there's no meaningful text beyond the URL.
 */
export function extractCaptionFromText(
  text: string | null | undefined,
  webUrl: string | null | undefined
): string | null {
  if (!text) return null;

  // Remove the URL from the text
  let caption = text;
  if (webUrl) {
    caption = caption.replace(webUrl, '').trim();
  }

  // Also remove any other URLs that might be in the text (tracking links, etc.)
  caption = caption
    .replace(/https?:\/\/[^\s]+/gi, '')
    .trim();

  // Clean up multiple newlines/spaces
  caption = caption
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();

  // Return null if empty or too short to be meaningful
  return caption.length > 0 ? caption : null;
}

/** `rawUrl` vient de `shareIntent.webUrl` — `null` si le partage était du texte
 *  brut sans lien exploitable, auquel cas il n'y a rien à analyser. */
export function analyzeSharedUrl(rawUrl: string | null | undefined): AnalyzedUrl | null {
  if (!rawUrl) return null;
  // Détecter la plateforme d'abord pour savoir si on doit nettoyer la query
  const platform = detectPlatform(rawUrl);
  const url = normalizeUrl(rawUrl, platform);
  if (!url) return null;
  return { url, platform };
}
