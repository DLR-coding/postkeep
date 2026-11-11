import test from 'node:test';
import assert from 'node:assert/strict';

import { buildExport, parsePostsLayout, parseThemePreference, toColorScheme } from './settings-logic.ts';

test('parseThemePreference accepte les trois valeurs et retombe sur « system »', () => {
  assert.equal(parseThemePreference('light'), 'light');
  assert.equal(parseThemePreference('dark'), 'dark');
  assert.equal(parseThemePreference('system'), 'system');
  assert.equal(parseThemePreference(null), 'system');
  assert.equal(parseThemePreference('purple'), 'system');
});

test('toColorScheme : « system » rend la main au téléphone', () => {
  assert.equal(toColorScheme('system'), 'unspecified');
  assert.equal(toColorScheme('dark'), 'dark');
});

test('buildExport : JSON lisible avec les champs utiles, sans colonnes internes', () => {
  const created = new Date(Date.UTC(2026, 9, 20, 8));
  // Un vrai post de la liste, avec ses colonnes internes (que l'export doit ignorer).
  const post = {
        id: 'p1',
        url: 'https://www.tiktok.com/@a/video/1',
        note: 'Try with udon',
        caption: 'Miso pasta',
        thumbnailUrl: 'https://cdn/x.jpg',
        createdAt: created,
        updatedAt: created,
        deletedAt: null,
        userId: null,
        openedAt: null,
        collectionNames: ['Recipes'],
  };
  const json = buildExport([post], new Date(Date.UTC(2026, 10, 11, 9)));
  const data = JSON.parse(json);
  assert.equal(data.app, 'PostKeep');
  assert.equal(data.exportedAt, '2026-11-11T09:00:00.000Z');
  assert.deepEqual(data.posts, [
    {
      url: 'https://www.tiktok.com/@a/video/1',
      caption: 'Miso pasta',
      note: 'Try with udon',
      collections: ['Recipes'],
      savedAt: '2026-10-20T08:00:00.000Z',
    },
  ]);
  assert.ok(json.includes('\n  "posts"'), 'indenté pour être lisible');
});

test('parsePostsLayout : liste par défaut, grille si enregistrée', () => {
  assert.equal(parsePostsLayout('grid'), 'grid');
  assert.equal(parsePostsLayout('list'), 'list');
  assert.equal(parsePostsLayout(null), 'list');
  assert.equal(parsePostsLayout('mosaic'), 'list');
});
