/**
 * Où trouver la vidéo et les images d'un post, par plateforme (ARCHITECTURE.md §13).
 * Logique pure, testée par `media-source-logic.test.ts` ; le téléchargement est dans
 * `media-source.ts`. Formats relevés en novembre 2026 sur de vrais posts : ils peuvent
 * changer sans prévenir.
 */

/** Taille maximale d'une vidéo envoyée à l'IA : la limite de `/audio/transcriptions` chez
 *  OpenAI, et un base64 d'environ 33 Mo dans Hermes. */
export const MAX_VIDEO_BYTES = 25 * 1024 * 1024;

/** Images d'un carrousel envoyées au plus. Chez Qwen3.5, de 270 tokens (photo X en
 *  `medium`) à 3 200 (image Instagram en 1080 px) chacune. */
export const MAX_IMAGES = 10;

/** Ce qu'un post montre : la première vidéo et les images, dans l'ordre du post. */
export type PostMedia = { videoUrl: string | null; imageUrls: string[] };

const NO_MEDIA: PostMedia = { videoUrl: null, imageUrls: [] };

/** Page d'intégration d'un post Instagram (`/p/<code>/` ou `/reel/<code>/`), ou null. */
export function instagramEmbedUrl(url: string): string | null {
  const code = url.match(/instagram\.com\/(?:[^/?#]+\/)?(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+)/)?.[1];
  return code ? `https://www.instagram.com/p/${code}/embed/captioned/` : null;
}

type IgNode = { __typename?: string; is_video?: boolean; display_url?: string; video_url?: string };

/** Médias de la page d'intégration Instagram. Le `contextJSON` (une chaîne JSON dans du
 *  JSON, d'où les deux `JSON.parse`) donne le type du post : vidéo, image ou carrousel
 *  (`GraphSidecar`). Sans lui, seule l'image affichée (`EmbeddedMediaImage`) reste : prise
 *  seulement hors reel, car pour une vidéo ce n'est que la couverture. */
export function parseInstagramMedia(html: string, isReel: boolean): PostMedia {
  const literal = html.match(/"contextJSON":("(?:[^"\\]|\\.)*")/)?.[1];
  let media: (IgNode & { edge_sidecar_to_children?: { edges?: { node: IgNode }[] } }) | undefined;
  try {
    media = literal ? JSON.parse(JSON.parse(literal)).gql_data?.shortcode_media : undefined;
  } catch {
    media = undefined;
  }
  if (media) {
    const nodes = media.edge_sidecar_to_children?.edges?.map((e) => e.node) ?? [media];
    return {
      // Une vidéo sans `video_url` (un reel sur deux) reste sans vidéo : sa couverture
      // seule donnerait un résumé approximatif (§13).
      videoUrl: nodes.find((n) => n.is_video)?.video_url ?? null,
      imageUrls: nodes.filter((n) => !n.is_video && n.display_url).map((n) => n.display_url!),
    };
  }
  if (isReel) return NO_MEDIA;
  const src = html.match(/class="EmbeddedMediaImage"[^>]*?src="([^"]+)"/)?.[1];
  return { videoUrl: null, imageUrls: src ? [src.replace(/&amp;/g, '&')] : [] };
}

type TikTokImage = { imageURL?: { urlList?: string[] } };

/** Médias de la page mobile TikTok (JSON `__UNIVERSAL_DATA_FOR_REHYDRATION__`). Un post
 *  photo (`imagePost`) donne ses images ; sa « vidéo » n'est que la musique du diaporama.
 *  L'URL de la vidéo n'est lisible qu'avec le cookie `tt_chain_token` posé par cette page. */
export function parseTikTokMedia(html: string): PostMedia {
  const json = html.match(/<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/)?.[1];
  if (!json) return NO_MEDIA;
  try {
    const scope = JSON.parse(json).__DEFAULT_SCOPE__ ?? {};
    const detail = scope['webapp.reflow.video.detail'] ?? scope['webapp.video-detail'];
    const item = detail?.itemInfo?.itemStruct;
    const images: TikTokImage[] = item?.imagePost?.images ?? [];
    if (images.length) {
      return {
        videoUrl: null,
        imageUrls: images
          .map(({ imageURL }) => {
            const urls = imageURL?.urlList ?? [];
            return urls.find((u) => /jpe?g/i.test(u)) ?? urls[0];
          })
          .filter((u): u is string => !!u),
      };
    }
    return { videoUrl: item?.video?.playAddr || item?.video?.downloadAddr || null, imageUrls: [] };
  } catch {
    return NO_MEDIA;
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
type XMedia = { type?: string; media_url_https?: string; video_info?: { variants?: XVariant[] } };

/** Variante mp4 la plus nette sous 1 Mbit/s (l'IA n'a pas besoin de HD), sinon la plus légère. */
function pickXVariant(variants: XVariant[]): string | null {
  const mp4 = variants
    .filter((v): v is XVariant & { url: string } => v.content_type === 'video/mp4' && !!v.url)
    .sort((a, b) => (a.bitrate ?? 0) - (b.bitrate ?? 0));
  const light = mp4.filter((v) => (v.bitrate ?? 0) <= 1_000_000);
  return (light.at(-1) ?? mp4[0])?.url ?? null;
}

/** Médias d'une réponse de syndication X : photos en taille `medium` (1200 px), et la
 *  première vidéo ou GIF animé. */
export function parseXMedia(body: unknown): PostMedia {
  const media = (body as { mediaDetails?: XMedia[] } | null)?.mediaDetails ?? [];
  const video = media.find((m) => m.video_info?.variants?.length);
  return {
    videoUrl: video ? pickXVariant(video.video_info!.variants!) : null,
    imageUrls: media
      .filter((m) => m.type === 'photo' && m.media_url_https)
      .map((m) => `${m.media_url_https}?name=medium`),
  };
}
