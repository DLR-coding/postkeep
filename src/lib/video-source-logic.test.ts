import test from 'node:test';
import assert from 'node:assert/strict';

import {
  instagramEmbedUrl,
  parseInstagramVideoUrl,
  parseTikTokVideoUrl,
  pickXVideoUrl,
  xSyndicationUrl,
} from './video-source-logic.ts';

test('instagramEmbedUrl : reel, post, URL avec compte ; null sinon', () => {
  assert.equal(instagramEmbedUrl('https://www.instagram.com/reel/DehO5gjSPgM/'), 'https://www.instagram.com/p/DehO5gjSPgM/embed/captioned/');
  assert.equal(instagramEmbedUrl('https://www.instagram.com/p/BsOGulcndj-/?igsh=x'), 'https://www.instagram.com/p/BsOGulcndj-/embed/captioned/');
  assert.equal(instagramEmbedUrl('https://www.instagram.com/someone/reel/ABC_1/'), 'https://www.instagram.com/p/ABC_1/embed/captioned/');
  assert.equal(instagramEmbedUrl('https://www.instagram.com/someone/'), null);
});

test('parseInstagramVideoUrl : URL échappée du contextJSON (format du 24/11/2026)', () => {
  const html =
    '"contextJSON":"{\\"video_url\\":\\"https:\\\\\\/\\\\\\/scontent-cdg4-2.cdninstagram.com\\\\\\/o1\\\\\\/v\\\\\\/a.mp4?_nc_cat=105&_nc_sid=5e9851\\\\u0026oe=6B067A9A\\",\\"is_video\\":true}"';
  assert.equal(
    parseInstagramVideoUrl(html),
    'https://scontent-cdg4-2.cdninstagram.com/o1/v/a.mp4?_nc_cat=105&_nc_sid=5e9851&oe=6B067A9A'
  );
  assert.equal(parseInstagramVideoUrl('"is_video\\":true'), null);
});

test('parseTikTokVideoUrl : playAddr de la page mobile, puis de la page desktop', () => {
  const page = (key: string, video: object) =>
    `<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__" type="application/json">${JSON.stringify({
      __DEFAULT_SCOPE__: { [key]: { itemInfo: { itemStruct: { video } } } },
    })}</script>`;
  assert.equal(
    parseTikTokVideoUrl(page('webapp.reflow.video.detail', { playAddr: 'https://v16-webapp.tiktok.com/a?tk=tt_chain_token' })),
    'https://v16-webapp.tiktok.com/a?tk=tt_chain_token'
  );
  assert.equal(parseTikTokVideoUrl(page('webapp.video-detail', { playAddr: '', downloadAddr: 'https://d' })), 'https://d');
  assert.equal(parseTikTokVideoUrl('<html>captcha</html>'), null);
});

test('xSyndicationUrl : identifiant et jeton ; null sans /status/', () => {
  assert.equal(
    xSyndicationUrl('https://x.com/NASA/status/2085116299223425392?s=20'),
    `https://cdn.syndication.twimg.com/tweet-result?id=2085116299223425392&token=${((2085116299223425392 / 1e15) * Math.PI).toString(36).replace(/(0+|\.)/g, '')}`
  );
  assert.equal(xSyndicationUrl('https://x.com/NASA'), null);
});

test('pickXVideoUrl : meilleure variante mp4 sous 1 Mbit/s, sinon la plus légère', () => {
  const body = (variants: object[]) => ({ mediaDetails: [{ video_info: { variants } }] });
  assert.equal(
    pickXVideoUrl(
      body([
        { content_type: 'application/x-mpegURL', url: 'https://m3u8' },
        { content_type: 'video/mp4', bitrate: 2176000, url: 'https://720' },
        { content_type: 'video/mp4', bitrate: 288000, url: 'https://270' },
        { content_type: 'video/mp4', bitrate: 832000, url: 'https://360' },
      ])
    ),
    'https://360'
  );
  assert.equal(pickXVideoUrl(body([{ content_type: 'video/mp4', bitrate: 5000000, url: 'https://hd' }])), 'https://hd');
  assert.equal(pickXVideoUrl({ text: 'no media' }), null);
});
