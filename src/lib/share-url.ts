/**
 * Analyse d'une URL partagée (Phase 2, TODO.md). Logique pure, sans dépendance —
 * `expo-share-intent` a déjà isolé l'URL dans le texte partagé (voir `webUrl`),
 * ce module se charge de la normaliser et d'en déduire la plateforme.
 */

export type Platform = 'instagram' | 'tiktok' | 'x' | 'threads';

const PLATFORM_HOSTS: Record<Platform, string[]> = {
  instagram: ['instagram.com'],
  tiktok: ['tiktok.com'],
  x: ['x.com', 'twitter.com'],
  threads: ['threads.net', 'threads.com'],
};

/** Aperçu = logo de plateforme déduit de l'URL, pas de métadonnées récupérées
 *  (ARCHITECTURE.md §6). En l'absence d'icône de marque dans les dépendances du
 *  projet, un badge coloré + libellé tient lieu de logo pour la V1. */
export const PLATFORM_META: Record<Platform, { label: string; badge: string; color: string }> = {
  instagram: { label: 'Instagram', badge: 'IG', color: '#E4405F' },
  tiktok: { label: 'TikTok', badge: 'TT', color: '#010101' },
  x: { label: 'X', badge: 'X', color: '#000000' },
  threads: { label: 'Threads', badge: 'TH', color: '#000000' },
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

/** Retire query et fragment (ARCHITECTURE.md §4) — Instagram régénère `?igsh=…`
 *  à chaque partage, sans ça deux partages du même post ne se ressemblent jamais. */
export function normalizeUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    parsed.search = '';
    parsed.hash = '';
    return parsed.toString();
  } catch {
    return null;
  }
}

export type AnalyzedUrl = {
  url: string;
  platform: Platform | null;
};

/** `rawUrl` vient de `shareIntent.webUrl` — `null` si le partage était du texte
 *  brut sans lien exploitable, auquel cas il n'y a rien à analyser. */
export function analyzeSharedUrl(rawUrl: string | null | undefined): AnalyzedUrl | null {
  if (!rawUrl) return null;
  const url = normalizeUrl(rawUrl);
  if (!url) return null;
  return { url, platform: detectPlatform(url) };
}
