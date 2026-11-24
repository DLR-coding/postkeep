// Récupération du mp4 d'un post depuis le téléphone (ARCHITECTURE.md §13).
import { Directory, File, Paths } from 'expo-file-system';

import { detectPlatform } from './share-url';
import {
  instagramEmbedUrl,
  MAX_VIDEO_BYTES,
  parseInstagramVideoUrl,
  parseTikTokVideoUrl,
  pickXVideoUrl,
  xSyndicationUrl,
} from './video-source-logic';

const MOBILE_UA =
  'Mozilla/5.0 (Linux; Android 14; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Mobile Safari/537.36';
// Robot de Facebook : seule façon d'obtenir le `video_url` de la page d'intégration
// Instagram (choix assumé de l'utilisateur, §13).
const FACEBOOK_CRAWLER_UA = 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)';

export type Video = { file: File; base64: string };

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
      xhr.status >= 200 && xhr.status < 300 ? resolve(xhr) : reject(new Error(`The video host answered ${xhr.status}.`));
    xhr.onerror = () => reject(new Error('Could not download the video. Check your connection.'));
    xhr.ontimeout = () => reject(new Error('Downloading the video took too long.'));
    xhr.send();
  });
}

const getText = async (url: string, headers: Record<string, string> = {}) =>
  (await get(url, headers, 'text', 30_000)).responseText;

/** URL directe du mp4, ou une erreur lisible (affichée dans le détail du post). */
async function videoUrl(postUrl: string): Promise<{ url: string; headers: Record<string, string> }> {
  const platform = detectPlatform(postUrl);
  const missing = new Error('No video found in this post.');
  if (platform === 'x') {
    const api = xSyndicationUrl(postUrl);
    const url = api && pickXVideoUrl(JSON.parse(await getText(api)));
    if (!url) throw missing;
    return { url, headers: {} };
  }
  if (platform === 'instagram') {
    const embed = instagramEmbedUrl(postUrl);
    const url = embed && parseInstagramVideoUrl(await getText(embed, { 'user-agent': FACEBOOK_CRAWLER_UA }));
    if (!url) throw missing;
    return { url, headers: {} };
  }
  if (platform === 'tiktok') {
    const url = parseTikTokVideoUrl(await getText(postUrl, { 'user-agent': MOBILE_UA }));
    if (!url) throw missing;
    return { url, headers: { 'user-agent': MOBILE_UA, referer: 'https://www.tiktok.com/' } };
  }
  throw new Error('Videos from this app are not supported yet.');
}

const readAsBase64 = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).replace(/^data:[^,]*,/, ''));
    reader.onerror = () => reject(new Error('Could not read the downloaded video.'));
    reader.readAsDataURL(blob);
  });

/** Télécharge la vidéo du post : fichier en cache (pour la transcription, envoyée depuis le
 *  disque) et base64 (pour `video_url`). Le fichier est à supprimer après usage. */
export async function downloadVideo(postUrl: string, postId: string): Promise<Video> {
  const { url, headers } = await videoUrl(postUrl);
  const blob = (await get(url, headers, 'blob', 120_000)).response as Blob;
  if (blob.size > MAX_VIDEO_BYTES) throw new Error('The video is too large (over 25 MB).');
  const base64 = await readAsBase64(blob);
  const dir = new Directory(Paths.cache, 'ai-videos');
  if (!dir.exists) dir.create();
  const file = new File(dir, `${postId}.mp4`);
  file.write(base64, { encoding: 'base64' });
  return { file, base64 };
}
