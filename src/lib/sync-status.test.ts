import test from 'node:test';
import assert from 'node:assert/strict';

import { formatSyncedAgo, syncStatusLabel } from './sync-status.ts';

const now = Date.UTC(2026, 10, 11, 12);
const MIN = 60_000;

test('formatSyncedAgo : moins d\'une minute = just now (horloge en avance comprise)', () => {
  assert.equal(formatSyncedAgo(now - 30_000, now), 'just now');
  assert.equal(formatSyncedAgo(now + 5_000, now), 'just now');
});

test('formatSyncedAgo : minutes, heures, jours', () => {
  assert.equal(formatSyncedAgo(now - 2 * MIN, now), '2 min ago');
  assert.equal(formatSyncedAgo(now - 59 * MIN, now), '59 min ago');
  assert.equal(formatSyncedAgo(now - 60 * MIN, now), '1 h ago');
  assert.equal(formatSyncedAgo(now - 24 * 60 * MIN, now), 'yesterday');
  assert.equal(formatSyncedAgo(now - 3 * 24 * 60 * MIN, now), '3 days ago');
});

test('syncStatusLabel : synchro en cours, erreur, jamais synchronisé, synchronisé', () => {
  assert.equal(syncStatusLabel({ status: 'syncing', lastSyncedAt: now, error: null }, now), 'Syncing…');
  assert.equal(syncStatusLabel({ status: 'error', lastSyncedAt: now, error: 'No connection' }, now), 'No connection');
  assert.equal(syncStatusLabel({ status: 'error', lastSyncedAt: null, error: null }, now), "Couldn't sync");
  assert.equal(syncStatusLabel({ status: 'idle', lastSyncedAt: null, error: null }, now), 'Not synced yet');
  assert.equal(syncStatusLabel({ status: 'idle', lastSyncedAt: now - 2 * MIN, error: null }, now), 'Synced 2 min ago');
});
