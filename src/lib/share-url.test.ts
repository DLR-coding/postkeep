import test from 'node:test';
import assert from 'node:assert/strict';

import { analyzeSharedUrl, detectPlatform, extractCaptionFromText, normalizeUrl } from './share-url.ts';

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
});

test('extractCaptionFromText gère les URLs de tracking supplémentaires', () => {
  assert.equal(
    extractCaptionFromText('Great content! https://instagram.com/reel/abc https://tracking.link/xyz', 'https://instagram.com/reel/abc'),
    'Great content!'
  );
});
