// Récupération de la vidéo et des images d'un post depuis le téléphone (ARCHITECTURE.md §13).
import { Directory, File, Paths } from 'expo-file-system';

import { detectPlatform } from './share-url';
import {
  instagramEmbedUrl,
  MAX_IMAGES,
  MAX_VIDEO_BYTES,
  parseInstagramMedia,
  parseTikTokMedia,
  parseXMedia,
  type PostMedia,
  xSyndicationUrl,
} from './media-source-logic';

const MOBILE_UA =
  'Mozilla/5.0 (Linux; Android 14; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Mobile Safari/537.36';
// Robot de Facebook : seule façon d'obtenir le `contextJSON` de la page d'intégration
// Instagram (choix assumé de l'utilisateur, §13).
const FACEBOOK_CRAWLER_UA = 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)';

export type Video = { file: File; base64: string };
/** Ce qui part à l'IA : la vidéo (fichier à supprimer après usage) et les images en data URL. */
export type DownloadedMedia = { video: Video | null; images: string[] };

/** XHR : délai appliqué par OkHttp (les timers JS gèlent app fermée), et même cookie jar
 *  pour toutes les requêtes, d'où le `tt_chain_token` de TikTok renvoyé tout seul. */
function get(url: string, headers: Record<string, string>, responseType: 'text' | 'blob', timeoutMs: number) {
  return new Promise<XMLHttpRequest>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url);
    xhr.responseType = responseType;
    xhr.timeout = timeoutMs;
    xhr.withCredentials = true;
    for (const [k, v] of Object.entries(headers)) xhr.setRequestHeader(k, v);
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300 ? resolve(xhr) : reject(new Error(`The post's site answered ${xhr.status}.`));
    xhr.onerror = () => reject(new Error('Could not download the post. Check your connection.'));
    xhr.ontimeout = () => reject(new Error('Downloading the post took too long.'));
    xhr.send();
  });
}

const getText = async (url: string, headers: Record<string, string> = {}) =>
  (await get(url, headers, 'text', 30_000)).responseText;

/** Adresses de la vidéo et des images du post, et les en-têtes pour les télécharger. */
async function findMedia(postUrl: string): Promise<PostMedia & { headers: Record<string, string> }> {
  const platform = detectPlatform(postUrl);
  if (platform === 'x') {
    const api = xSyndicationUrl(postUrl);
    return { ...(api ? parseXMedia(JSON.parse(await getText(api))) : parseXMedia(null)), headers: {} };
  }
  if (platform === 'instagram') {
    const embed = instagramEmbedUrl(postUrl);
    const isReel = /\/(reels?|tv)\//.test(postUrl);
    const html = embed ? await getText(embed, { 'user-agent': FACEBOOK_CRAWLER_UA }) : '';
    return { ...parseInstagramMedia(html, isReel), headers: {} };
  }
  if (platform === 'tiktok') {
    const media = parseTikTokMedia(await getText(postUrl, { 'user-agent': MOBILE_UA }));
    return { ...media, headers: { 'user-agent': MOBILE_UA, referer: 'https://www.tiktok.com/' } };
  }
  throw new Error('Posts from this app are not supported yet.');
}

const readAsDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Could not read the downloaded post.'));
    reader.readAsDataURL(blob);
  });

async function downloadVideo(url: string, headers: Record<string, string>, postId: string): Promise<Video> {
  const blob = (await get(url, headers, 'blob', 120_000)).response as Blob;
  if (blob.size > MAX_VIDEO_BYTES) throw new Error('The video is too large (over 25 MB).');
  const base64 = (await readAsDataUrl(blob)).replace(/^data:[^,]*,/, '');
  const dir = new Directory(Paths.cache, 'ai-videos');
  if (!dir.exists) dir.create();
  const file = new File(dir, `${postId}.mp4`);
  file.write(base64, { encoding: 'base64' });
  return { file, base64 };
}

/** Image en data URL. Un CDN qui ne dit pas le type (`application/octet-stream`) passe
 *  pour du JPEG : le serveur IA refuse une data URL qui n'est pas `image/*`. */
async function downloadImage(url: string, headers: Record<string, string>): Promise<string> {
  const dataUrl = await readAsDataUrl((await get(url, headers, 'blob', 60_000)).response as Blob);
  return dataUrl.startsWith('data:image/') ? dataUrl : dataUrl.replace(/^data:[^;,]*/, 'data:image/jpeg');
}

/** Télécharge la première vidéo (fichier en cache pour la transcription, envoyée depuis le
 *  disque, et base64 pour `video_url`) et jusqu'à `MAX_IMAGES` images du post. */
export async function downloadMedia(postUrl: string, postId: string): Promise<DownloadedMedia> {
  const { videoUrl, imageUrls, headers } = await findMedia(postUrl);
  if (!videoUrl && !imageUrls.length) throw new Error('No image or video found in this post.');
  const images: string[] = [];
  for (const url of imageUrls.slice(0, MAX_IMAGES)) images.push(await downloadImage(url, headers));
  return { video: videoUrl ? await downloadVideo(videoUrl, headers, postId) : null, images };
}
