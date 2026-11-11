import test from 'node:test';
import assert from 'node:assert/strict';

import { formatPostDate } from './format-date.ts';

const now = new Date(Date.UTC(2026, 10, 11, 12));

test('formatPostDate : jour et mois sans année pour l\'année en cours', () => {
  assert.equal(formatPostDate(new Date(Date.UTC(2026, 10, 8, 12)), now), '8 Nov');
});

test('formatPostDate : année ajoutée pour une autre année', () => {
  assert.equal(formatPostDate(new Date(Date.UTC(2025, 2, 3, 12)), now), '3 Mar 2025');
});

test('formatPostDate : septembre en trois lettres, comme les autres mois', () => {
  assert.equal(formatPostDate(new Date(Date.UTC(2026, 8, 8, 12)), now), '8 Sep');
});
