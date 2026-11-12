import assert from 'node:assert/strict';
import test from 'node:test';

import { MAX_ATTEMPTS, parseAttempts, pickBackfill } from './metadata-backfill.ts';

const ig = { id: 'ig', url: 'https://www.instagram.com/p/abc/' };
const tt = { id: 'tt', url: 'https://www.tiktok.com/@a/video/1' };
const x = { id: 'x', url: 'https://x.com/a/status/1' };

test('pickBackfill ne garde que Instagram/TikTok sous la limite d’essais', () => {
  const { candidates } = pickBackfill([ig, tt, x], { tt: MAX_ATTEMPTS });
  assert.deepEqual(candidates, [ig]);
});

test('pickBackfill oublie les compteurs des posts qui ne manquent plus de miniature', () => {
  const { attempts } = pickBackfill([ig, tt], { ig: 1, tt: MAX_ATTEMPTS, gone: 2 });
  assert.deepEqual(attempts, { ig: 1, tt: MAX_ATTEMPTS });
});

test('parseAttempts tolère une valeur absente ou corrompue', () => {
  assert.deepEqual(parseAttempts(null), {});
  assert.deepEqual(parseAttempts('pas du json'), {});
  assert.deepEqual(parseAttempts('[1,2]'), {});
  assert.deepEqual(parseAttempts('{"a":2}'), { a: 2 });
});
