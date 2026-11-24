/**
 * Où trouver le mp4 d'un post, par plateforme (ARCHITECTURE.md §13). Logique pure, testée
 * par `video-source-logic.test.ts` ; le téléchargement est dans `video-source.ts`.
 * Formats relevés le 24 novembre 2026 sur de vrais posts : ils peuvent changer sans prévenir.
 */

/** Taille maximale d'une vidéo envoyée à l'IA : la limite de `/audio/transcriptions` chez
 *  OpenAI, et un base64 d'environ 33 Mo dans Hermes. */
export const MAX_VIDEO_BYTES = 25 * 1024 * 1024;

/** Page d'intégration d'un post Instagram (`/p/<code>/` ou `/reel/<code>/`), ou null. */
export function instagramEmbedUrl(url: string): string | null {
  const code = url.match(/instagram\.com\/(?:[^/?#]+\/)?(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+)/)?.[1];
  return code ? `https://www.instagram.com/p/${code}/embed/captioned/` : null;
}

/** `video_url` du `contextJSON` de la page d'intégration : une chaîne JSON échappée dans du
 *  JS, d'où les barres obliques inverses à retirer. */
export function parseInstagramVideoUrl(html: string): string | null {
  const raw = html.match(/video_url\\*":\\*"(https?:.*?)\\*"/)?.[1];
  return raw ? raw.replace(/\\+u0026/g, '&').replace(/\\/g, '') : null;
}

/** `playAddr` de la page mobile d'une vidéo TikTok (JSON `__UNIVERSAL_DATA_FOR_REHYDRATION__`).
 *  L'URL n'est lisible qu'avec le cookie `tt_chain_token` posé par cette même page. */
export function parseTikTokVideoUrl(html: string): string | null {
  const json = html.match(/<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/)?.[1];
  if (!json) return null;
  try {
    const scope = JSON.parse(json).__DEFAULT_SCOPE__ ?? {};
    const detail = scope['webapp.reflow.video.detail'] ?? scope['webapp.video-detail'];
    const video = detail?.itemInfo?.itemStruct?.video;
    return video?.playAddr || video?.downloadAddr || null;
  } catch {
    return null;
  }
}

/** Endpoint de syndication de X (non documenté) : jeton dérivé de l'identifiant du post. */
export function xSyndicationUrl(url: string): string | null {
  const id = url.match(/(?:x|twitter)\.com\/[^/]+\/status(?:es)?\/(\d+)/)?.[1];
  if (!id) return null;
  const token = ((Number(id) / 1e15) * Math.PI).toString(36).replace(/(0+|\.)/g, '');
  return `https://cdn.syndication.twimg.com/tweet-result?id=${id}&token=${token}`;
}

type XVariant = { content_type?: string; bitrate?: number; url?: string };

/** Variante mp4 la plus nette sous 1 Mbit/s (l'IA n'a pas besoin de HD), sinon la plus légère. */
export function pickXVideoUrl(body: unknown): string | null {
  const media = (body as { mediaDetails?: { video_info?: { variants?: XVariant[] } }[] } | null)?.mediaDetails ?? [];
  const mp4 = media
    .flatMap((m) => m.video_info?.variants ?? [])
    .filter((v): v is XVariant & { url: string } => v.content_type === 'video/mp4' && !!v.url)
    .sort((a, b) => (a.bitrate ?? 0) - (b.bitrate ?? 0));
  const light = mp4.filter((v) => (v.bitrate ?? 0) <= 1_000_000);
  return (light.at(-1) ?? mp4[0])?.url ?? null;
}
