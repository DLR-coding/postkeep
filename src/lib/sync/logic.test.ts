import test from 'node:test';
import assert from 'node:assert/strict';

import type { Collection, Post, PostCollection } from '../../db/schema.ts';
import { fromRemote, isNewer, nextCursor, planGuestMerge, toRemote, type MergeRows } from './logic.ts';

const T1 = new Date(Date.UTC(2026, 10, 1, 8));
const T2 = new Date(Date.UTC(2026, 10, 2, 8));
const UID = '0b6f8d4e-1c2a-4f6e-9a3b-5d7c8e9f0a1b';

const base = { createdAt: T1, updatedAt: T1, deletedAt: null, userId: null };
const collection = (id: string, name: string, extra: Partial<Collection> = {}): Collection => ({
  ...base,
  id,
  name,
  ...extra,
});
const post = (id: string, url: string | null, note: string | null = null, extra: Partial<Post> = {}): Post => ({
  ...base,
  id,
  url,
  note,
  caption: null,
  thumbnailUrl: null,
  openedAt: null,
  ...extra,
});
const pair = (id: string, postId: string, collectionId: string, extra: Partial<PostCollection> = {}): PostCollection => ({
  ...base,
  id,
  postId,
  collectionId,
  ...extra,
});
const rows = (r: Partial<MergeRows>): MergeRows => ({ collections: [], posts: [], postCollections: [], ...r });

test('isNewer : plus récente gagne, plus ancienne ou égale perd, absente en local gagne', () => {
  assert.equal(isNewer(2000, 1000), true);
  assert.equal(isNewer(1000, 2000), false);
  assert.equal(isNewer(1000, 1000), false);
  assert.equal(isNewer(1000, undefined), true);
});

test('toRemote / fromRemote : post en snake_case et ms, aller-retour identique', () => {
  const local = post('p1', 'https://x.com/a/status/1', 'Note', {
    caption: 'Légende',
    thumbnailUrl: 'https://cdn/x.jpg',
    openedAt: T2,
    deletedAt: T2,
    userId: UID,
  });
  const remote = toRemote('posts', local, UID);
  assert.deepEqual(remote, {
    id: 'p1',
    user_id: UID,
    created_at: T1.getTime(),
    updated_at: T1.getTime(),
    deleted_at: T2.getTime(),
    url: 'https://x.com/a/status/1',
    note: 'Note',
    caption: 'Légende',
    thumbnail_url: 'https://cdn/x.jpg',
    opened_at: T2.getTime(),
  });
  assert.deepEqual(fromRemote('posts', { ...remote, server_updated_at: '2026-11-02T08:00:00.123456+00:00' }), local);
});

test('toRemote / fromRemote : collections et rangements, nulls conservés, user_id imposé', () => {
  const c = collection('c1', 'Recipes');
  const remoteC = toRemote('collections', c, UID);
  assert.deepEqual(remoteC, {
    id: 'c1',
    user_id: UID,
    created_at: T1.getTime(),
    updated_at: T1.getTime(),
    deleted_at: null,
    name: 'Recipes',
  });
  assert.deepEqual(fromRemote('collections', remoteC), { ...c, userId: UID });

  const pc = pair('pc1', 'p1', 'c1');
  const remotePc = toRemote('post_collections', pc, UID);
  assert.equal(remotePc.post_id, 'p1');
  assert.equal(remotePc.collection_id, 'c1');
  assert.deepEqual(fromRemote('post_collections', remotePc), { ...pc, userId: UID });
});

test('nextCursor : dernière ligne de la page, horodatage gardé en chaîne', () => {
  assert.equal(nextCursor([]), null);
  assert.deepEqual(
    nextCursor([
      { server_updated_at: '2026-11-11T08:00:00.000001+00:00', id: 'a' },
      { server_updated_at: '2026-11-11T08:00:00.000002+00:00', id: 'b' },
    ]),
    { ts: '2026-11-11T08:00:00.000002+00:00', id: 'b' }
  );
});

test('planGuestMerge : collection de même nom (casse, espaces) fusionnée, rangements remappés', () => {
  const plan = planGuestMerge({
    guest: rows({
      collections: [collection('gc1', '  recipes '), collection('gc2', 'Travel')],
      posts: [post('gp1', 'https://tiktok.com/v/1')],
      postCollections: [pair('gpc1', 'gp1', 'gc1'), pair('gpc2', 'gp1', 'gc2')],
    }),
    account: rows({ collections: [collection('ac1', 'Recipes')] }),
  });
  assert.deepEqual(plan, {
    softDelete: [{ table: 'collections', id: 'gc1' }],
    remap: [{ id: 'gpc1', postId: 'gp1', collectionId: 'ac1' }],
    notes: [],
  });
});

test('planGuestMerge : lignes supprimées ignorées pour la correspondance', () => {
  const plan = planGuestMerge({
    guest: rows({
      collections: [collection('gc1', 'Recipes'), collection('gc2', 'Old', { deletedAt: T2 })],
      posts: [post('gp1', 'https://a/1'), post('gp2', 'https://a/2', null, { deletedAt: T2 })],
    }),
    account: rows({
      collections: [collection('ac1', 'Recipes', { deletedAt: T2 }), collection('ac2', 'Old')],
      posts: [post('ap1', 'https://a/1', null, { deletedAt: T2 }), post('ap2', 'https://a/2')],
    }),
  });
  assert.deepEqual(plan, { softDelete: [], remap: [], notes: [] });
});

test('planGuestMerge : post de même URL fusionné, notes égales, vides ou différentes', () => {
  const plan = planGuestMerge({
    guest: rows({
      posts: [
        post('gp1', 'https://a/1', 'Same'),
        post('gp2', 'https://a/2', '  '),
        post('gp3', 'https://a/3', 'Guest note'),
        post('gp4', 'https://a/4', 'Only guest'),
        post('gp5', null, 'Texte brut'),
      ],
    }),
    account: rows({
      posts: [
        post('ap1', 'https://a/1', 'Same'),
        post('ap2', 'https://a/2', 'Account'),
        post('ap3', 'https://a/3', 'Account note'),
        post('ap4', 'https://a/4', null),
        post('ap5', null, 'Texte brut'),
      ],
    }),
  });
  assert.deepEqual(
    plan.softDelete,
    ['gp1', 'gp2', 'gp3', 'gp4'].map((id) => ({ table: 'posts', id }))
  );
  assert.deepEqual(plan.notes, [
    { postId: 'ap3', note: 'Account note\n\nGuest note' },
    { postId: 'ap4', note: 'Only guest' },
  ]);
});

test('planGuestMerge : rangement remappé qui existe déjà côté compte → supprimé, pas de doublon', () => {
  const plan = planGuestMerge({
    guest: rows({
      posts: [post('gp1', 'https://a/1')],
      collections: [collection('gc1', 'Other')],
      postCollections: [pair('gpc1', 'gp1', 'ac1'), pair('gpc2', 'gp1', 'gc1'), pair('gpc3', 'gp1', 'ac2', { deletedAt: T2 })],
    }),
    account: rows({
      posts: [post('ap1', 'https://a/1')],
      collections: [collection('ac1', 'Recipes')],
      postCollections: [pair('apc1', 'ap1', 'ac1')],
    }),
  });
  assert.deepEqual(plan.softDelete, [
    { table: 'posts', id: 'gp1' },
    { table: 'post_collections', id: 'gpc1' },
  ]);
  assert.deepEqual(plan.remap, [{ id: 'gpc2', postId: 'ap1', collectionId: 'gc1' }]);
});

test('planGuestMerge : post et collection fusionnés sur la même paire, doublons invités évités', () => {
  const plan = planGuestMerge({
    guest: rows({
      posts: [post('gp1', 'https://a/1')],
      collections: [collection('gc1', 'Recipes'), collection('gc2', 'RECIPES')],
      postCollections: [pair('gpc1', 'gp1', 'gc1'), pair('gpc2', 'gp1', 'gc2')],
    }),
    account: rows({
      posts: [post('ap1', 'https://a/1')],
      collections: [collection('ac1', 'Recipes')],
    }),
  });
  assert.deepEqual(plan.remap, [{ id: 'gpc1', postId: 'ap1', collectionId: 'ac1' }]);
  assert.deepEqual(plan.softDelete, [
    { table: 'collections', id: 'gc1' },
    { table: 'collections', id: 'gc2' },
    { table: 'posts', id: 'gp1' },
    { table: 'post_collections', id: 'gpc2' },
  ]);
});
