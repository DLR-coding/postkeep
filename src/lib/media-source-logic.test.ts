import test from 'node:test';
import assert from 'node:assert/strict';

import {
  instagramEmbedUrl,
  parseInstagramMedia,
  parseTikTokMedia,
  parseXMedia,
  xSyndicationUrl,
} from './media-source-logic.ts';

test('instagramEmbedUrl : reel, post, URL avec compte ; null sinon', () => {
  assert.equal(instagramEmbedUrl('https://www.instagram.com/reel/DehO5gjSPgM/'), 'https://www.instagram.com/p/DehO5gjSPgM/embed/captioned/');
  assert.equal(instagramEmbedUrl('https://www.instagram.com/p/BsOGulcndj-/?igsh=x'), 'https://www.instagram.com/p/BsOGulcndj-/embed/captioned/');
  assert.equal(instagramEmbedUrl('https://www.instagram.com/someone/reel/ABC_1/'), 'https://www.instagram.com/p/ABC_1/embed/captioned/');
  assert.equal(instagramEmbedUrl('https://www.instagram.com/someone/'), null);
});

/** Page d'intégration : `contextJSON` est une chaîne JSON dans un objet JSON (format du 24/11/2026). */
const igPage = (media: object) =>
  `<script>s.handle({"isSidecar":false,"contextJSON":${JSON.stringify(
    JSON.stringify({ context: { type: 'x' }, gql_data: { shortcode_media: media } })
  )}});</script>`;

test('parseInstagramMedia : vidéo, image, carrousel mixte', () => {
  assert.deepEqual(
    parseInstagramMedia(igPage({ __typename: 'GraphVideo', is_video: true, display_url: 'https://cover', video_url: 'https://a.mp4?x=1&oe=2' }), true),
    { videoUrl: 'https://a.mp4?x=1&oe=2', imageUrls: [] }
  );
  assert.deepEqual(parseInstagramMedia(igPage({ __typename: 'GraphImage', is_video: false, display_url: 'https://img' }), false), {
    videoUrl: null,
    imageUrls: ['https://img'],
  });
  const sidecar = {
    __typename: 'GraphSidecar',
    display_url: 'https://first',
    edge_sidecar_to_children: {
      edges: [
        { node: { is_video: false, display_url: 'https://1' } },
        { node: { is_video: true, display_url: 'https://cover', video_url: 'https://v.mp4' } },
        { node: { is_video: false, display_url: 'https://3' } },
      ],
    },
  };
  assert.deepEqual(parseInstagramMedia(igPage(sidecar), false), { videoUrl: 'https://v.mp4', imageUrls: ['https://1', 'https://3'] });
});

test('parseInstagramMedia : reel sans video_url, et page sans contextJSON', () => {
  // La couverture d'un reel ne remplace pas sa vidéo.
  assert.deepEqual(parseInstagramMedia(igPage({ __typename: 'GraphVideo', is_video: true, display_url: 'https://cover' }), true), {
    videoUrl: null,
    imageUrls: [],
  });
  const old = '<img class="EmbeddedMediaImage" alt="egg" src="https://scontent/a.jpg?stp=1&amp;ccb=7-5" />';
  assert.deepEqual(parseInstagramMedia(old, false), { videoUrl: null, imageUrls: ['https://scontent/a.jpg?stp=1&ccb=7-5'] });
  assert.deepEqual(parseInstagramMedia(old, true), { videoUrl: null, imageUrls: [] });
});

const tiktokPage = (key: string, itemStruct: object) =>
  `<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__" type="application/json">${JSON.stringify({
    __DEFAULT_SCOPE__: { [key]: { itemInfo: { itemStruct } } },
  })}</script>`;

test('parseTikTokMedia : playAddr de la page mobile, puis de la page desktop', () => {
  assert.deepEqual(
    parseTikTokMedia(tiktokPage('webapp.reflow.video.detail', { video: { playAddr: 'https://v16-webapp.tiktok.com/a' } })),
    { videoUrl: 'https://v16-webapp.tiktok.com/a', imageUrls: [] }
  );
  assert.deepEqual(parseTikTokMedia(tiktokPage('webapp.video-detail', { video: { playAddr: '', downloadAddr: 'https://d' } })), {
    videoUrl: 'https://d',
    imageUrls: [],
  });
  assert.deepEqual(parseTikTokMedia('<html>captcha</html>'), { videoUrl: null, imageUrls: [] });
});

test('parseTikTokMedia : post photo, images en JPEG de préférence, sans la musique', () => {
  const item = {
    video: { playAddr: 'https://music-slideshow' },
    imagePost: {
      images: [
        { imageURL: { urlList: ['https://p16/a~tplv-photomode-image.webp', 'https://p16/a~tplv-photomode-image.jpeg'] } },
        { imageURL: { urlList: ['https://p16/b.webp'] } },
        { imageURL: {} },
      ],
    },
  };
  assert.deepEqual(parseTikTokMedia(tiktokPage('webapp.reflow.video.detail', item)), {
    videoUrl: null,
    imageUrls: ['https://p16/a~tplv-photomode-image.jpeg', 'https://p16/b.webp'],
  });
});

test('xSyndicationUrl : identifiant et jeton ; null sans /status/', () => {
  assert.equal(
    xSyndicationUrl('https://x.com/NASA/status/2085116299223425392?s=20'),
    `https://cdn.syndication.twimg.com/tweet-result?id=2085116299223425392&token=${((2085116299223425392 / 1e15) * Math.PI).toString(36).replace(/(0+|\.)/g, '')}`
  );
  assert.equal(xSyndicationUrl('https://x.com/NASA'), null);
});

test('parseXMedia : meilleure variante mp4 sous 1 Mbit/s, sinon la plus légère', () => {
  const body = (variants: object[]) => ({ mediaDetails: [{ type: 'video', video_info: { variants } }] });
  assert.equal(
    parseXMedia(
      body([
        { content_type: 'application/x-mpegURL', url: 'https://m3u8' },
        { content_type: 'video/mp4', bitrate: 2176000, url: 'https://720' },
        { content_type: 'video/mp4', bitrate: 288000, url: 'https://270' },
        { content_type: 'video/mp4', bitrate: 832000, url: 'https://360' },
      ])
    ).videoUrl,
    'https://360'
  );
  assert.equal(parseXMedia(body([{ content_type: 'video/mp4', bitrate: 5000000, url: 'https://hd' }])).videoUrl, 'https://hd');
  assert.deepEqual(parseXMedia({ text: 'no media' }), { videoUrl: null, imageUrls: [] });
});

test('parseXMedia : photos en taille medium, et la vidéo d\'un post mixte', () => {
  assert.deepEqual(
    parseXMedia({
      mediaDetails: [
        { type: 'photo', media_url_https: 'https://pbs.twimg.com/media/A.jpg' },
        { type: 'video', video_info: { variants: [{ content_type: 'video/mp4', bitrate: 832000, url: 'https://360' }] } },
        { type: 'photo', media_url_https: 'https://pbs.twimg.com/media/B.png' },
      ],
    }),
    { videoUrl: 'https://360', imageUrls: ['https://pbs.twimg.com/media/A.jpg?name=medium', 'https://pbs.twimg.com/media/B.png?name=medium'] }
  );
});
