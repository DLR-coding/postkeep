import test from 'node:test';
import assert from 'node:assert/strict';

import { buildCollectionPreviews, UNCATEGORIZED_KEY, type PreviewRow } from './collection-previews.ts';

let n = 0;
const row = (over: Partial<PreviewRow> & { daysAgo: number }): PreviewRow => ({
  collectionId: 'recipes',
  postId: `p${n++}`,
  url: 'https://www.tiktok.com/@a/video/1',
  thumbnailUrl: null,
  updatedAt: new Date(Date.UTC(2026, 10, 10 - over.daysAgo)),
  ...over,
});

test('plateforme dominante et 3 miniatures les plus récentes non nulles', () => {
  const rows = [
    row({ daysAgo: 4, thumbnailUrl: 'old.jpg' }),
    row({ daysAgo: 3, url: 'https://www.instagram.com/reel/x/', thumbnailUrl: 'ig.jpg' }),
    row({ daysAgo: 2, thumbnailUrl: null }),
    row({ daysAgo: 1, thumbnailUrl: 'b.jpg' }),
    row({ daysAgo: 0, thumbnailUrl: 'a.jpg' }),
  ];
  const preview = buildCollectionPreviews(rows).get('recipes');
  assert.deepEqual(preview, { thumbnails: ['a.jpg', 'b.jpg', 'ig.jpg'], platform: 'tiktok' });
});

test('une collection sans miniature a une liste vide', () => {
  const preview = buildCollectionPreviews([row({ daysAgo: 0 })]).get('recipes');
  assert.deepEqual(preview?.thumbnails, []);
});

test('un post sans collection va sous la clé « none »', () => {
  const previews = buildCollectionPreviews([row({ daysAgo: 0, collectionId: null, thumbnailUrl: 't.jpg' })]);
  assert.equal(UNCATEGORIZED_KEY, 'none');
  assert.deepEqual(previews.get(UNCATEGORIZED_KEY)?.thumbnails, ['t.jpg']);
});

test('un post sans URL ou de plateforme inconnue ne compte pas pour la plateforme', () => {
  const rows = [
    row({ daysAgo: 1, url: null }),
    row({ daysAgo: 0, url: 'https://youtube.com/watch?v=a' }),
  ];
  assert.equal(buildCollectionPreviews(rows).get('recipes')?.platform, null);
});

test('égalité de plateformes : celle du post le plus récent', () => {
  const rows = [
    row({ daysAgo: 1, url: 'https://www.instagram.com/reel/x/' }),
    row({ daysAgo: 0, url: 'https://www.tiktok.com/@a/video/1' }),
  ];
  assert.equal(buildCollectionPreviews(rows).get('recipes')?.platform, 'tiktok');
});

test('miniatures sans doublon et collection absente sans entrée', () => {
  const rows = [row({ daysAgo: 1, thumbnailUrl: 'same.jpg' }), row({ daysAgo: 0, thumbnailUrl: 'same.jpg' })];
  const previews = buildCollectionPreviews(rows);
  assert.deepEqual(previews.get('recipes')?.thumbnails, ['same.jpg']);
  assert.equal(previews.has('other'), false);
});

test('un post rangé dans une collection active ne compte pas aussi sous « none »', () => {
  // Une de ses collections est supprimée (ligne sans collection), l'autre est active.
  const rows = [
    row({ daysAgo: 0, postId: 'shared', collectionId: 'recipes', thumbnailUrl: 'a.jpg' }),
    row({ daysAgo: 0, postId: 'shared', collectionId: null, thumbnailUrl: 'a.jpg' }),
  ];
  const previews = buildCollectionPreviews(rows);
  assert.equal(previews.has(UNCATEGORIZED_KEY), false);
  assert.deepEqual(previews.get('recipes')?.thumbnails, ['a.jpg']);
});
