// Compte de dev : crée le compte s'il n'existe pas, puis crée les posts, collections et
// rangements de référence ci-dessous qui manquent (ids fixes, relançable à volonté).
// Les posts ajoutés pendant les tests (partages réels…) sont GARDÉS : ils font partie du
// jeu de test. Seul `--reset` les passe en suppression logique (jamais de vrai DELETE).
//
//   npm run seed:dev              # ajoute la référence manquante, ne touche à rien d'autre
//   npm run seed:dev -- --reset   # réécrit la référence et supprime tout le reste
//
// Identifiants dans `.env.local` (jamais commité) : POSTKEEP_DEV_EMAIL,
// POSTKEEP_DEV_PASSWORD, plus EXPO_PUBLIC_SUPABASE_URL / _PUBLISHABLE_KEY.
import { createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const email = process.env.POSTKEEP_DEV_EMAIL;
const password = process.env.POSTKEEP_DEV_PASSWORD;
if (!url || !key || !email || !password) {
  console.error('Variables manquantes dans .env.local (voir .env.example).');
  process.exit(1);
}

// Id stable dérivé d'une clé lisible, au format UUID comme les ids de l'app.
const id = (k) => {
  const h = createHash('sha256').update(`postkeep-dev:${k}`).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
};

const LONG_NAME = 'A deliberately very long collection name to test wrapping!!'; // 60 car., le max de l'app
const COLLECTIONS = [
  'Recipes',
  'Travel — Japan',
  'Workout',
  'Design inspo',
  'Read later',
  'Crème brûlée & desserts 🍮',
  LONG_NAME,
  'Ω',
  'Night owl 🦉',
  'Gifts',
  'Empty collection', // aucun post : dossier vide
];

// Images stables pour tester les formats de vignette (picsum : même image pour une même seed).
const img = (seed, w, h) => `https://picsum.photos/seed/postkeep-${seed}/${w}/${h}`;
const REDDIT_THUMB =
  'https://preview.redd.it/uy1wd9fi3x0i1.jpeg?width=640&crop=smart&auto=webp&s=598db8826904cca9c3dd8e4e54f44bba8e499be9';

const LONG_NOTE = [
  'Very long note to check that the note box scrolls on its own in edit mode and is cut cleanly in the list. 📝',
  ...Array.from({ length: 14 }, (_, n) =>
    `Paragraph ${n + 1}. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua — with an accent here: crème, déjà vu, naïve.`
  ),
  'Last line: if you can read this in edit mode, scrolling works.',
].join('\n\n');

const LONG_CAPTION =
  'POV: you finally found the perfect recipe 🍝✨ ' +
  'Save this for later because you WILL want it. '.repeat(12) +
  Array.from({ length: 30 }, (_, n) => `#tag${n + 1}`).join(' ');

// k: clé stable de l'id · url · caption · note · cols: collections · thumb · days: âge en jours
// opened: déjà ouvert · deleted: pierre tombale (ne doit jamais s'afficher)
const POSTS = [
  // — Référence d'origine (un par plateforme, quelques notes) —
  { k: 'ig-ramen', url: 'https://www.instagram.com/reel/DEVramen01/', caption: 'The only tonkotsu recipe you need 🍜 #ramen', note: 'Try the 12h broth on a Sunday', cols: ['Recipes', 'Travel — Japan'] },
  { k: 'ig-kyoto', url: 'https://www.instagram.com/p/DEVkyoto02/', caption: 'Golden hour at Fushimi Inari', cols: ['Travel — Japan'] },
  { k: 'ig-legs', url: 'https://www.instagram.com/reel/DEVlegs003/', caption: 'Leg day finisher — 4 rounds', cols: ['Workout'] },
  { k: 'ig-poster', url: 'https://www.instagram.com/p/DEVposter4/', caption: 'Swiss poster series, part 3', note: 'Grid + one loud colour', cols: ['Design inspo'] },
  { k: 'tt-pasta', url: 'https://www.tiktok.com/@chefdev/video/7400000000000000001', caption: 'Cacio e pepe that never clumps', cols: ['Recipes'] },
  { k: 'tt-tokyo', url: 'https://www.tiktok.com/@traveldev/video/7400000000000000002', caption: '48h in Tokyo on a budget', note: 'Hotel tip at 0:45', cols: ['Travel — Japan', 'Read later'] },
  { k: 'tt-mobility', url: 'https://www.tiktok.com/@coachdev/video/7400000000000000003', caption: '10 min hip mobility routine', cols: ['Workout'] },
  { k: 'tt-noclass', url: 'https://www.tiktok.com/@randomdev/video/7400000000000000004', caption: 'This cat learned to open doors', cols: [] },
  { k: 'x-thread', url: 'https://x.com/devwriter/status/1850000000000000001', caption: 'A thread on why local-first apps feel faster than they are 🧵', cols: ['Read later'] },
  { k: 'x-type', url: 'https://x.com/typedev/status/1850000000000000002', caption: 'Variable fonts are underused. Here are 5 examples.', cols: ['Design inspo'] },
  { k: 'th-coffee', url: 'https://www.threads.net/@baristadev/post/DEVcoffee1', caption: 'Pour-over ratio cheat sheet', note: '1:16, 94°C', cols: ['Recipes'] },
  { k: 'rd-japan', url: 'https://www.reddit.com/r/JapanTravel/comments/devjp1/itinerary_review_14_days/', note: 'Good comments about the JR pass', cols: ['Travel — Japan'] },
  { k: 'rd-noclass', url: 'https://www.reddit.com/r/reactnative/comments/devrn1/expo_sdk_57_upgrade_notes/', cols: [] },
  { k: 'yt-talk', url: 'https://www.youtube.com/watch?v=devTalk001', note: 'Watch the Q&A at the end', cols: ['Read later'] },
  { k: 'note-only', url: null, note: 'Plain text share with no link — lands in the note', cols: [] },

  // — Cas limites —
  // Vrai post Reddit partagé depuis l'app le 11 novembre 2026 (titre + miniature via RSS).
  { k: 'rd-pics-real', url: 'https://www.reddit.com/r/pics/comments/1xt9ai7/oc_my_neighbor_is_not_happy_about_recent_events/', caption: '[OC] My neighbor is not happy about recent events.', thumb: REDDIT_THUMB, cols: [] },
  { k: 'thumb-vertical', url: 'https://www.instagram.com/reel/DEVvert001/', caption: 'Vertical 9:16 thumbnail — should fill the tile', thumb: img('vertical', 1080, 1920), cols: ['Night owl 🦉'] },
  { k: 'thumb-square', url: 'https://www.instagram.com/p/DEVsquare1/', caption: 'Square thumbnail — centred on a blurred copy', thumb: img('square', 1080, 1080), cols: ['Gifts'] },
  { k: 'thumb-landscape', url: 'https://www.tiktok.com/@dev/video/7400000000000000010', caption: 'Landscape thumbnail on a TikTok', thumb: img('landscape', 1920, 1080), cols: [] },
  { k: 'thumb-broken', url: 'https://x.com/devbroken/status/1850000000000000010', caption: 'Broken thumbnail URL (404) — must fall back cleanly', thumb: 'https://picsum.photos/id/999999/10/10', cols: [] },
  { k: 'long-note', url: 'https://www.instagram.com/p/DEVlongnote/', caption: 'Post with a very long note', note: LONG_NOTE, cols: ['Read later'] },
  { k: 'long-caption', url: 'https://www.tiktok.com/@dev/video/7400000000000000011', caption: LONG_CAPTION, cols: ['Recipes'] },
  { k: 'long-everything', url: 'https://www.instagram.com/reel/DEVlongall1/', caption: LONG_CAPTION, note: LONG_NOTE, cols: [LONG_NAME, 'Crème brûlée & desserts 🍮'] },
  { k: 'all-collections', url: 'https://x.com/devmany/status/1850000000000000020', caption: 'In every collection — chips must truncate with +N', cols: COLLECTIONS.filter((c) => c !== 'Empty collection') },
  { k: 'accents', url: 'https://www.instagram.com/p/DEVcreme01/', caption: 'Crème brûlée façon grand-mère', note: 'Search “creme” or “brulee” must find this (accents folded)', cols: ['Crème brûlée & desserts 🍮'] },
  { k: 'emoji-only', url: 'https://www.threads.net/@dev/post/DEVemoji1', caption: '🔥🔥🔥 🍜🍣🍱 ✨', cols: ['Ω'] },
  { k: 'unknown-site', url: 'https://example.com/blog/2026/11/a-very-long-article-slug-to-test-url-truncation?ref=newsletter&utm=keep', caption: 'Unknown website: neutral fallback, query kept', cols: ['Read later'] },
  { k: 'opened', url: 'https://www.youtube.com/watch?v=devOpened01', caption: 'Already opened once', opened: true, cols: [] },
  { k: 'old-2024', url: 'https://www.instagram.com/p/DEVold2024/', caption: 'Saved in 2024 — the date must show the year', days: 700, cols: ['Travel — Japan'] },
  { k: 'tombstone', url: 'https://www.instagram.com/p/DEVdeleted/', caption: 'DELETED — must never appear', deleted: true, cols: ['Recipes'] },

  // — Volume : défilement et grille —
  ...Array.from({ length: 40 }, (_, n) => {
    const platforms = [
      ['instagram', (x) => `https://www.instagram.com/p/DEVbulk${x}/`],
      ['tiktok', (x) => `https://www.tiktok.com/@bulk/video/74000000000001${x}`],
      ['x', (x) => `https://x.com/bulk/status/18500000000001${x}`],
      ['reddit', (x) => `https://www.reddit.com/r/test/comments/bulk${x}/post_${x}/`],
    ];
    const [name, toUrl] = platforms[n % platforms.length];
    const x = String(n + 1).padStart(3, '0');
    return {
      k: `bulk-${x}`,
      url: toUrl(x),
      caption: `Bulk ${name} post #${n + 1}`,
      thumb: n % 3 === 0 ? img(`bulk-${x}`, 1080, 1920) : null,
      days: 20 + n * 9,
      cols: n % 5 === 0 ? ['Workout'] : [],
    };
  }),
];

// Sans `--reset`, rien d'existant n'est touché : seules les lignes de référence absentes
// sont créées (les notes, collections… modifiées pendant les tests restent telles quelles).
const reset = process.argv.includes('--reset');

const supabase = createClient(url, key, { auth: { persistSession: false } });

let { data, error } = await supabase.auth.signInWithPassword({ email, password });
if (error?.code === 'invalid_credentials') {
  ({ data, error } = await supabase.auth.signUp({ email, password }));
  if (!error) console.log(`Compte de dev créé : ${email}`);
}
if (error || !data.session) {
  console.error('Connexion impossible :', error?.message ?? 'pas de session');
  process.exit(1);
}
const userId = data.session.user.id;

const now = Date.now();
const DAY = 86_400_000;
const base = (days) => ({ user_id: userId, created_at: now - days * DAY, updated_at: now, deleted_at: null });

const collections = COLLECTIONS.map((name, i) => ({ ...base(i), id: id(`col:${name}`), name }));
// Âge par défaut = rang dans la liste (le premier est le plus récent).
const posts = POSTS.map((p, i) => ({
  ...base(p.days ?? i),
  id: id(`post:${p.k}`),
  url: p.url,
  caption: p.caption ?? null,
  note: p.note ?? null,
  thumbnail_url: p.thumb ?? null,
  opened_at: p.opened ? now - DAY : null,
  deleted_at: p.deleted ? now : null,
}));
const pairs = POSTS.flatMap((p, i) =>
  p.cols.map((c) => ({
    ...base(p.days ?? i),
    id: id(`pair:${p.k}:${c}`),
    post_id: id(`post:${p.k}`),
    collection_id: id(`col:${c}`),
  }))
);

// Ordre imposé par les clés étrangères : collections et posts avant les rangements.
for (const [table, rows] of [['collections', collections], ['posts', posts], ['post_collections', pairs]]) {
  const { error: upsertError } = await supabase
    .from(table)
    .upsert(rows, { onConflict: 'id', ignoreDuplicates: !reset });
  if (upsertError) {
    console.error(`${table} :`, upsertError.message);
    process.exit(1);
  }
}

// `--reset` seulement : tout ce qui n'est pas dans la référence passe en suppression
// logique — les appareils connectés le recevront comme n'importe quelle suppression.
if (reset) {
  for (const [table, rows] of [['post_collections', pairs], ['posts', posts], ['collections', collections]]) {
    const keep = rows.map((r) => r.id);
    const { error: cleanError } = await supabase
      .from(table)
      .update({ deleted_at: now, updated_at: now })
      .is('deleted_at', null)
      .not('id', 'in', `(${keep.join(',')})`);
    if (cleanError) {
      console.error(`${table} (nettoyage) :`, cleanError.message);
      process.exit(1);
    }
  }
}

console.log(
  `Compte de dev prêt : référence de ${posts.length} posts, ${collections.length} collections, ${pairs.length} rangements` +
    (reset ? ' (le reste supprimé).' : ' (posts de test ajoutés gardés).')
);
