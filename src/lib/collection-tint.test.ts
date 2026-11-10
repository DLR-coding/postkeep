import test from 'node:test';
import assert from 'node:assert/strict';

import { collectionInitial, collectionTint, TINTS } from './collection-tint.ts';

test('collectionTint est stable pour un même nom', () => {
  assert.deepEqual(collectionTint('Recipes'), collectionTint('Recipes'));
});

test('collectionTint renvoie toujours une teinte de la palette', () => {
  for (const name of ['Recipes', 'Japan trip', 'A', '', '🍜 Ramen', 'Superlonglonglonglonglonglong']) {
    assert.ok(TINTS.includes(collectionTint(name)), name);
  }
});

test('collectionTint répartit des noms différents sur plusieurs teintes', () => {
  const names = ['Recipes', 'Japan trip', 'Design inspo', 'Workout', 'To read', 'Bouffe', 'Perfume', 'House'];
  assert.ok(new Set(names.map(collectionTint)).size >= 4);
});

test('collectionInitial prend la première lettre en majuscule, emoji compris', () => {
  assert.equal(collectionInitial('recipes'), 'R');
  assert.equal(collectionInitial('  japan'), 'J');
  assert.equal(collectionInitial('🍜 Ramen'), '🍜');
  assert.equal(collectionInitial(''), '?');
});
