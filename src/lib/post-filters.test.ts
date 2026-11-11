import test from 'node:test';
import assert from 'node:assert/strict';

import { filterCollectionsByName, filterPosts, matchesText, splitHighlight } from './post-filters.ts';

const post = (url: string | null, caption: string | null = null, note: string | null = null) => ({ url, caption, note });

const tiktok = post('https://www.tiktok.com/@chef/video/1', 'Tonkotsu ramen at home');
const reel = post('https://www.instagram.com/reel/abc/', 'Kyoto in autumn');
const tweet = post('https://x.com/dev/status/1', 'Shipping a React Native app');
const threadsNote = post('https://www.threads.net/@lea/post/1', null, 'Ask Léa for the ramen place');
const plainText = post(null, null, 'Buy miso');
const youtube = post('https://youtube.com/watch?v=abc', 'A video');
const all = [tiktok, reel, tweet, threadsNote, plainText, youtube];

test('filterPosts garde seulement la plateforme choisie', () => {
  assert.deepEqual(filterPosts(all, { platform: 'tiktok', query: '' }), [tiktok]);
  assert.deepEqual(filterPosts(all, { platform: 'instagram', query: '' }), [reel]);
  assert.deepEqual(filterPosts(all, { platform: 'x', query: '' }), [tweet]);
});

test('filterPosts : un post sans URL ou d\'une plateforme inconnue n\'apparaît qu\'avec « all »', () => {
  assert.deepEqual(filterPosts(all, { platform: 'all', query: '' }), all);
  for (const platform of ['instagram', 'tiktok', 'x'] as const) {
    const result = filterPosts(all, { platform, query: '' });
    assert.ok(!result.includes(plainText) && !result.includes(youtube));
  }
});

test('filterPosts cherche dans la légende, la note et l\'URL', () => {
  assert.deepEqual(filterPosts(all, { platform: 'all', query: 'ramen' }), [tiktok, threadsNote]);
  assert.deepEqual(filterPosts(all, { platform: 'all', query: 'reel/abc' }), [reel]);
});

test('filterPosts combine plateforme et recherche', () => {
  assert.deepEqual(filterPosts(all, { platform: 'tiktok', query: 'ramen' }), [tiktok]);
});

test('filterPosts ignore une requête vide ou blanche', () => {
  assert.deepEqual(filterPosts(all, { platform: 'all', query: '   ' }), all);
});

test('matchesText ignore la casse et les accents dans les deux sens', () => {
  assert.equal(matchesText('Ask Léa', 'lea'), true);
  assert.equal(matchesText('Ask Lea', 'LÉA'), true);
  assert.equal(matchesText('Ask Lea', 'bob'), false);
});

test('splitHighlight marque toutes les occurrences en gardant le texte d\'origine', () => {
  assert.deepEqual(splitHighlight('Ask Léa about Léa', 'lea'), [
    { text: 'Ask ', match: false },
    { text: 'Léa', match: true },
    { text: ' about ', match: false },
    { text: 'Léa', match: true },
  ]);
});

test('splitHighlight accepte les caractères spéciaux de regex', () => {
  assert.deepEqual(splitHighlight('c++ tips', 'c++'), [
    { text: 'c++', match: true },
    { text: ' tips', match: false },
  ]);
  assert.deepEqual(splitHighlight('a (b)', '('), [
    { text: 'a ', match: false },
    { text: '(', match: true },
    { text: 'b)', match: false },
  ]);
});

test('splitHighlight sans requête renvoie le texte entier non marqué', () => {
  assert.deepEqual(splitHighlight('Hello', ''), [{ text: 'Hello', match: false }]);
  assert.deepEqual(splitHighlight('Hello', '  '), [{ text: 'Hello', match: false }]);
});

test('filterCollectionsByName filtre sur le nom', () => {
  const cols = [{ name: 'Japan trip' }, { name: 'Recipes' }];
  assert.deepEqual(filterCollectionsByName(cols, 'japan'), [{ name: 'Japan trip' }]);
  assert.deepEqual(filterCollectionsByName(cols, ''), cols);
});

test('texte en Unicode décomposé (NFD, iOS) : trouvé sans accent, surligné en entier', () => {
  const decomposed = 'Ask Léa'; // « Léa » avec un accent combinant
  assert.equal(matchesText(decomposed, 'lea'), true);
  assert.deepEqual(splitHighlight(decomposed, 'lea'), [
    { text: 'Ask ', match: false },
    { text: 'Léa', match: true },
  ]);
});
