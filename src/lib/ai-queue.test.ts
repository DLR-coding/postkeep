import test from 'node:test';
import assert from 'node:assert/strict';

import { enqueue, MAX_ATTEMPTS, parseQueue, pendingIds, recordFailure, recordSuccess } from './ai-queue.ts';

test('un post échoue MAX_ATTEMPTS fois puis sort des posts à essayer, raison gardée', () => {
  let q = enqueue({}, 'p1');
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    assert.deepEqual(pendingIds(q), ['p1']);
    q = recordFailure(q, 'p1', `boom ${i}`);
  }
  assert.deepEqual(pendingIds(q), []);
  assert.equal(q.p1.error, `boom ${MAX_ATTEMPTS - 1}`);
});

test('une relance manuelle repart à zéro essai et peut remplacer le résumé', () => {
  let q = recordFailure(recordFailure(recordFailure(enqueue({}, 'p1'), 'p1', 'x'), 'p1', 'x'), 'p1', 'x');
  q = enqueue(q, 'p1', true);
  assert.deepEqual(q.p1, { attempts: 0, error: null, overwrite: true });
  assert.deepEqual(pendingIds(q), ['p1']);
});

test('un succès retire le post, les autres restent dans l\'ordre', () => {
  const q = recordSuccess(enqueue(enqueue(enqueue({}, 'a'), 'b'), 'c'), 'b');
  assert.deepEqual(pendingIds(q), ['a', 'c']);
});

test('parseQueue : vide, illisible ou pas un objet donnent une file vide', () => {
  assert.deepEqual(parseQueue(null), {});
  assert.deepEqual(parseQueue('{oops'), {});
  assert.deepEqual(parseQueue('[1]'), {});
  assert.deepEqual(parseQueue('{"p1":{"attempts":1,"error":"x","overwrite":false}}').p1.attempts, 1);
});
