import test from 'node:test';
import assert from 'node:assert/strict';

import { analyzeSharedUrl, detectPlatform, normalizeUrl } from './share-url.ts';

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

test('normalizeUrl retire query et fragment', () => {
  assert.equal(
    normalizeUrl('https://www.instagram.com/reel/abc/?igsh=xyz123#comments'),
    'https://www.instagram.com/reel/abc/'
  );
});

test('normalizeUrl renvoie null pour une URL invalide', () => {
  assert.equal(normalizeUrl('pas une url'), null);
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
