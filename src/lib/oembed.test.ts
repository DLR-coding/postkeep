import test from 'node:test';
import assert from 'node:assert/strict';

import { parseRedditOEmbed } from './oembed.ts';

test('parseRedditOEmbed prend le titre, sans miniature', () => {
  assert.deepEqual(
    parseRedditOEmbed({ type: 'rich', provider_name: 'reddit', title: '  Coucher de soleil sur le lac  ' }),
    { caption: 'Coucher de soleil sur le lac', thumbnailUrl: null }
  );
});

test('parseRedditOEmbed renvoie vide sans titre exploitable', () => {
  assert.deepEqual(parseRedditOEmbed({ title: '   ' }), { caption: null, thumbnailUrl: null });
  assert.deepEqual(parseRedditOEmbed({}), { caption: null, thumbnailUrl: null });
  assert.deepEqual(parseRedditOEmbed(null), { caption: null, thumbnailUrl: null });
});
