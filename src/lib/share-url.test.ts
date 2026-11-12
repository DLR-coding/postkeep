import test from 'node:test';
import assert from 'node:assert/strict';

import {
  analyzeSharedUrl,
  detectPlatform,
  extractCaptionFromText,
  isVerticalVideo,
  normalizeUrl,
} from './share-url.ts';

test('detectPlatform reconnaît les quatre plateformes', () => {
  assert.equal(detectPlatform('https://www.instagram.com/reel/abc/'), 'instagram');
  assert.equal(detectPlatform('https://vm.tiktok.com/xyz/'), 'tiktok');
  assert.equal(detectPlatform('https://x.com/user/status/1'), 'x');
  assert.equal(detectPlatform('https://twitter.com/user/status/1'), 'x');
  assert.equal(detectPlatform('https://www.threads.net/@user/post/1'), 'threads');
});

test('detectPlatform renvoie null pour un domaine inconnu ou une URL invalide', () => {
  assert.equal(detectPlatform('https://example.com'), null);
  assert.equal(detectPlatform('pas une url'), null);
});

test('normalizeUrl retire query et fragment pour les plateformes connues', () => {
  assert.equal(
    normalizeUrl('https://www.instagram.com/reel/abc/?igsh=xyz123#comments', 'instagram'),
    'https://www.instagram.com/reel/abc/'
  );
});

test('normalizeUrl garde la query pour les URLs inconnues (ex: YouTube)', () => {
  assert.equal(
    normalizeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ#t=30', null),
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
  );
});

test('normalizeUrl renvoie null pour une URL invalide', () => {
  assert.equal(normalizeUrl('pas une url', null), null);
});

test('analyzeSharedUrl combine normalisation et détection', () => {
  assert.deepEqual(analyzeSharedUrl('https://www.tiktok.com/@user/video/1?is_from_webapp=1'), {
    url: 'https://www.tiktok.com/@user/video/1',
    platform: 'tiktok',
  });
});

test('analyzeSharedUrl renvoie null sans lien exploitable (texte brut)', () => {
  assert.equal(analyzeSharedUrl(null), null);
  assert.equal(analyzeSharedUrl(undefined), null);
});

test('extractCaptionFromText extrait la légende en retirant l\'URL', () => {
  // Caption before URL
  assert.equal(
    extractCaptionFromText('Check out this recipe! https://instagram.com/reel/abc', 'https://instagram.com/reel/abc'),
    'Check out this recipe!'
  );

  // Caption after URL
  assert.equal(
    extractCaptionFromText('https://tiktok.com/video/123 Amazing tutorial', 'https://tiktok.com/video/123'),
    'Amazing tutorial'
  );

  // Multi-line caption
  assert.equal(
    extractCaptionFromText('First line\nSecond line\nhttps://instagram.com/reel/abc', 'https://instagram.com/reel/abc'),
    'First line\nSecond line'
  );
});

test('extractCaptionFromText renvoie null si pas de texte au-delà de l\'URL', () => {
  assert.equal(extractCaptionFromText('https://instagram.com/reel/abc', 'https://instagram.com/reel/abc'), null);
  assert.equal(extractCaptionFromText(null, null), null);
  assert.equal(extractCaptionFromText('', null), null);
  // Le formulaire passe l'URL normalisée : le paramètre de suivi ne doit pas devenir la légende.
  assert.equal(
    extractCaptionFromText('https://www.instagram.com/p/abc/?igsh=MTc4MmM1YmI2Ng==', 'https://www.instagram.com/p/abc/'),
    null
  );
});

test('extractCaptionFromText gère les URLs de tracking supplémentaires', () => {
  assert.equal(
    extractCaptionFromText('Great content! https://instagram.com/reel/abc https://tracking.link/xyz', 'https://instagram.com/reel/abc'),
    'Great content!'
  );
});

test('isVerticalVideo : TikTok et Reels seulement', () => {
  const check = (url: string | null) => isVerticalVideo(url, url ? detectPlatform(url) : null);
  assert.equal(check('https://www.tiktok.com/@a/video/1'), true);
  assert.equal(check('https://www.instagram.com/reel/abc/'), true);
  assert.equal(check('https://www.instagram.com/p/abc/'), false);
  assert.equal(check('https://x.com/a/status/1'), false);
  assert.equal(check(null), false);
});

test('detectPlatform reconnaît Reddit (www, old, liens courts redd.it)', () => {
  assert.equal(detectPlatform('https://www.reddit.com/r/reactnative/comments/abc/title/'), 'reddit');
  assert.equal(detectPlatform('https://old.reddit.com/r/reactnative/'), 'reddit');
  assert.equal(detectPlatform('https://redd.it/abc123'), 'reddit');
  assert.equal(detectPlatform('https://notreddit.com/r/x'), null);
});

test('analyzeSharedUrl retire le tracking des liens de partage Reddit', () => {
  assert.deepEqual(
    analyzeSharedUrl('https://www.reddit.com/r/reactnative/comments/abc/title/?utm_source=share&utm_medium=android_app'),
    { url: 'https://www.reddit.com/r/reactnative/comments/abc/title/', platform: 'reddit' }
  );
});
