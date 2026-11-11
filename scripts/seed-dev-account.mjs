// Compte de dev : crée le compte s'il n'existe pas, puis remet son contenu à l'état de
// référence ci-dessous (posts, collections, rangements de test). Relançable à volonté :
// les lignes de référence ont des ids fixes et sont réécrites, tout le reste du compte
// passe en suppression logique (comme l'app, jamais de vrai DELETE).
//
//   npm run seed:dev
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

const COLLECTIONS = ['Recipes', 'Travel — Japan', 'Workout', 'Design inspo', 'Read later'];

// [clé, url, légende, note, collections]
const POSTS = [
  ['ig-ramen', 'https://www.instagram.com/reel/DEVramen01/', 'The only tonkotsu recipe you need 🍜 #ramen', 'Try the 12h broth on a Sunday', ['Recipes', 'Travel — Japan']],
  ['ig-kyoto', 'https://www.instagram.com/p/DEVkyoto02/', 'Golden hour at Fushimi Inari', null, ['Travel — Japan']],
  ['ig-legs', 'https://www.instagram.com/reel/DEVlegs003/', 'Leg day finisher — 4 rounds', null, ['Workout']],
  ['ig-poster', 'https://www.instagram.com/p/DEVposter4/', 'Swiss poster series, part 3', 'Grid + one loud colour', ['Design inspo']],
  ['tt-pasta', 'https://www.tiktok.com/@chefdev/video/7400000000000000001', 'Cacio e pepe that never clumps', null, ['Recipes']],
  ['tt-tokyo', 'https://www.tiktok.com/@traveldev/video/7400000000000000002', '48h in Tokyo on a budget', 'Hotel tip at 0:45', ['Travel — Japan', 'Read later']],
  ['tt-mobility', 'https://www.tiktok.com/@coachdev/video/7400000000000000003', '10 min hip mobility routine', null, ['Workout']],
  ['tt-noclass', 'https://www.tiktok.com/@randomdev/video/7400000000000000004', 'This cat learned to open doors', null, []],
  ['x-thread', 'https://x.com/devwriter/status/1850000000000000001', 'A thread on why local-first apps feel faster than they are 🧵', null, ['Read later']],
  ['x-type', 'https://x.com/typedev/status/1850000000000000002', 'Variable fonts are underused. Here are 5 examples.', null, ['Design inspo']],
  ['th-coffee', 'https://www.threads.net/@baristadev/post/DEVcoffee1', 'Pour-over ratio cheat sheet', '1:16, 94°C', ['Recipes']],
  ['rd-japan', 'https://www.reddit.com/r/JapanTravel/comments/devjp1/itinerary_review_14_days/', null, 'Good comments about the JR pass', ['Travel — Japan']],
  ['rd-noclass', 'https://www.reddit.com/r/reactnative/comments/devrn1/expo_sdk_57_upgrade_notes/', null, null, []],
  ['yt-talk', 'https://www.youtube.com/watch?v=devTalk001', null, 'Watch the Q&A at the end', ['Read later']],
  ['note-only', null, null, 'Plain text share with no link — lands in the note', []],
];

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
// Dates d'enregistrement étalées sur les 15 derniers jours, la plus récente en tête.
const base = (i) => ({ user_id: userId, created_at: now - i * 86_400_000, updated_at: now, deleted_at: null });

const collections = COLLECTIONS.map((name, i) => ({ ...base(i), id: id(`col:${name}`), name }));
const posts = POSTS.map(([k, postUrl, caption, note], i) => ({
  ...base(i),
  id: id(`post:${k}`),
  url: postUrl,
  caption,
  note,
  thumbnail_url: null,
  opened_at: null,
}));
const pairs = POSTS.flatMap(([k, , , , cols], i) =>
  cols.map((c) => ({ ...base(i), id: id(`pair:${k}:${c}`), post_id: id(`post:${k}`), collection_id: id(`col:${c}`) }))
);

// Ordre imposé par les clés étrangères : collections et posts avant les rangements.
for (const [table, rows] of [['collections', collections], ['posts', posts], ['post_collections', pairs]]) {
  const { error: upsertError } = await supabase.from(table).upsert(rows, { onConflict: 'id' });
  if (upsertError) {
    console.error(`${table} :`, upsertError.message);
    process.exit(1);
  }
}

// Tout ce qui n'est pas dans la référence (créé pendant des tests) passe en suppression
// logique — les appareils connectés le recevront comme n'importe quelle suppression.
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

console.log(`Compte de dev prêt : ${posts.length} posts, ${collections.length} collections, ${pairs.length} rangements.`);
