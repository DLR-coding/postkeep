import test from 'node:test';
import assert from 'node:assert/strict';

import { parseRedditOEmbed, parseRedditRss } from './oembed.ts';

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

// Extrait réel (raccourci) de `https://www.reddit.com/r/pics/comments/<id>/<slug>/.rss`.
const RSS = `<?xml version="1.0" encoding="UTF-8"?><feed xmlns="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/"><title>[OC] My neighbor &amp; me : pics</title><entry><author><name>/u/someone</name></author><title>[OC] My neighbor &amp; me</title><media:thumbnail url="https://preview.redd.it/uy1wd9fi3x0i1.jpeg?width=640&amp;crop=smart&amp;auto=webp&amp;s=598d" /></entry></feed>`;

test("parseRedditRss prend le titre de l'entrée (pas celui du flux) et la miniature décodée", () => {
  assert.deepEqual(parseRedditRss(RSS), {
    caption: '[OC] My neighbor & me',
    thumbnailUrl: 'https://preview.redd.it/uy1wd9fi3x0i1.jpeg?width=640&crop=smart&auto=webp&s=598d',
  });
});

test('parseRedditRss : pas d’entrée ou pas de miniature', () => {
  assert.deepEqual(parseRedditRss('<feed><title>x</title></feed>'), { caption: null, thumbnailUrl: null });
  assert.deepEqual(parseRedditRss('<feed><entry><title>Texte seul</title></entry></feed>'), {
    caption: 'Texte seul',
    thumbnailUrl: null,
  });
});
