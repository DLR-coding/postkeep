# Comptes et synchronisation — plan d'implémentation

Spec : [../specs/2026-11-11-comptes-synchro-design.md](../specs/2026-11-11-comptes-synchro-design.md)
Branche : `feat/account-sync` · Date : 11 novembre 2026

**État du projet Supabase au départ** (`xrzubssvamvmfjeokbyy`, vérifié le 11 novembre) :
actif, aucune table dans `public`, fournisseur email activé, `mailer_autoconfirm: false`
(confirmation d'email active — à couper, tâche 1). CLI `supabase` 3.1.0 disponible via
`npx`, jeton d'accès présent dans `~/.supabase/access-token`.

Chaque tâche se termine par : types (`npx tsc --noEmit`), lint (`npx eslint src`), tests
(`node --experimental-strip-types --no-warnings --test src/lib/*.test.ts src/lib/sync/*.test.ts src/screens/collections/tile-size.test.ts`),
puis un commit en anglais sans scope. Pas de push sans demande.

---

## Tâche 1 — Base Supabase (serveur)

**Fichier** : `supabase/migrations/20261111000000_account_sync.sql`

```sql
-- Mêmes colonnes que le schéma local (src/db/schema.ts), dates en ms (bigint).
create table public.collections (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at bigint not null,
  updated_at bigint not null,
  deleted_at bigint,
  server_updated_at timestamptz not null default clock_timestamp(),
  name text not null
);

create table public.posts (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at bigint not null,
  updated_at bigint not null,
  deleted_at bigint,
  server_updated_at timestamptz not null default clock_timestamp(),
  url text,
  note text,
  caption text,
  thumbnail_url text,
  opened_at bigint
);

create table public.post_collections (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at bigint not null,
  updated_at bigint not null,
  deleted_at bigint,
  server_updated_at timestamptz not null default clock_timestamp(),
  post_id text not null references public.posts (id) on delete cascade,
  collection_id text not null references public.collections (id) on delete cascade
);

create index on public.collections (user_id, server_updated_at, id);
create index on public.posts (user_id, server_updated_at, id);
create index on public.post_collections (user_id, server_updated_at, id);

-- Dernière écriture gagnante : une mise à jour qui n'est pas plus récente est ignorée
-- (pas d'erreur, la ligne en place reste). Évite aussi le rebond entre appareils : un
-- appareil qui renvoie une ligne qu'il vient de recevoir ne la « rajeunit » pas.
create function public.sync_last_write_wins() returns trigger
language plpgsql as $$
begin
  if tg_op = 'UPDATE' and new.updated_at <= old.updated_at then
    return null;
  end if;
  new.server_updated_at := clock_timestamp();
  return new;
end;
$$;

create trigger collections_lww before insert or update on public.collections
  for each row execute function public.sync_last_write_wins();
create trigger posts_lww before insert or update on public.posts
  for each row execute function public.sync_last_write_wins();
create trigger post_collections_lww before insert or update on public.post_collections
  for each row execute function public.sync_last_write_wins();

alter table public.collections enable row level security;
alter table public.posts enable row level security;
alter table public.post_collections enable row level security;

create policy "own rows" on public.collections for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own rows" on public.posts for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own rows" on public.post_collections for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Pas de DELETE accordé : suppression logique uniquement (ARCHITECTURE.md §4).
grant select, insert, update on public.collections, public.posts, public.post_collections
  to authenticated;

-- Droit à l'effacement : supprime l'utilisateur, ses lignes partent en cascade.
create function public.delete_my_account() returns void
language sql security definer set search_path = '' as $$
  delete from auth.users where id = (select auth.uid());
$$;
revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
```

**Appliquer** : API de gestion (`POST /v1/projects/{ref}/database/query` avec le jeton de
`~/.supabase/access-token`, pas besoin du mot de passe de la base) ou éditeur SQL du
tableau de bord. Réglages auth via `PATCH /v1/projects/{ref}/config/auth` :
`mailer_autoconfirm: true`, `password_min_length: 8`. Vérifier les noms exacts des champs
dans la doc de l'API de gestion avant l'appel.

**Vérifier (curl, deux comptes de test créés pour l'occasion puis supprimés)** :
- inscription sans email de confirmation → session immédiate ;
- A insère un post ; B ne le voit pas (`select` vide) et ne peut pas le modifier ;
- upsert d'A avec un `updated_at` plus ancien → ligne inchangée, `server_updated_at` aussi ;
- `delete from` refusé (pas de droit) ;
- `rpc/delete_my_account` d'A → ses lignes ont disparu.

Commit : `feat: Supabase schema for account sync`.

## Tâche 2 — Client Supabase et configuration

- `npx expo install @supabase/supabase-js` (avant tout `npm install`). Vérifier dans la doc
  Supabase à jour (Context7) s'il faut un polyfill en React Native ; si un module natif
  apparaît → s'arrêter et signaler (AGENTS.md).
- `.env.example` (commité) et `.env.local` (ignoré) : `EXPO_PUBLIC_SUPABASE_URL`,
  `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Variables EAS (`eas env:create`, visibilité
  plaintext) pour development / preview / production ; vérifier dans la doc EAS comment un
  profil choisit son environnement et l'indiquer dans `eas.json` si nécessaire.
- `src/lib/supabase.ts` : `createClient(url, key, { auth: { storage, autoRefreshToken: true,
  persistSession: true, detectSessionInUrl: false } })`, `storage` = `expo-sqlite/kv-store`
  (API asynchrone `getItem`/`setItem`/`removeItem`). `AppState` : `startAutoRefresh()` au
  premier plan, `stopAutoRefresh()` sinon (recommandation Supabase pour React Native).
- Vérifier sur appareil : l'app démarre, `supabase.auth.getSession()` répond sans erreur.

Commit : `feat: Supabase client with the session in the SQLite key-value store`.

## Tâche 3 — Logique pure de synchro (testée)

**Fichiers** : `src/lib/sync/logic.ts`, `src/lib/sync/logic.test.ts`

- `toRemote(table, row, userId)` / `fromRemote(table, row)` : camelCase ↔ snake_case,
  `Date` ↔ ms ; `server_updated_at` jamais copié en local.
- `isNewer(incoming, local)` : `incoming.updated_at > local.updated_at` (local absent → vrai).
- `nextCursor(rows)` : `{ ts, id }` de la dernière ligne d'une page triée par
  `(server_updated_at, id)`. `ts` reste la **chaîne** renvoyée par le serveur (les
  microsecondes seraient perdues dans un `Date` JS).
- `planGuestMerge({ guest, account })` → liste d'opérations, sans I/O :
  - collection invitée de même nom (trim + insensible à la casse) qu'une du compte →
    rangements remappés vers celle du compte, invitée en `deleted_at` ;
  - post invité de même URL qu'un du compte → rangements remappés vers celui du compte
    (sans doublon de paire), note accolée (`compte + "\n\n" + invité`) si différente et non
    vide, invité en `deleted_at` ;
  - le reste est rattaché (`user_id` = compte).
- Tests : ligne plus récente / plus ancienne / égale ; mapping aller-retour ; fusion par
  nom avec casse et espaces ; fusion de post avec notes égales, différentes, vides ;
  rangement remappé qui existe déjà côté compte (pas de doublon) ; curseur.

Commit : `feat: pure sync logic (row mapping, last write wins, guest merge)`.

## Tâche 4 — Moteur de synchro

**Fichiers** : `src/lib/sync/engine.ts`, `src/lib/sync/state.ts`, `src/stores/account-store.ts`

- Marques et curseurs dans le kv-store, clés préfixées par l'id du compte
  (`sync:<uid>:push:<table>`, `sync:<uid>:pull:<table>`, `sync:<uid>:bootstrapped`).
- `push(uid)` : pour `collections`, `posts`, `post_collections` dans cet ordre, lignes
  locales `user_id = uid` et `updated_at > marque`, `upsert(..., { onConflict: 'id' })` par
  paquets de 500 ; marque = plus grand `updated_at` envoyé, enregistrée après succès.
- `pull(uid)` : même ordre, pages de 500 triées `server_updated_at, id`, filtre
  `server_updated_at > ts OR (= ts AND id > id)`. Application dans une transaction :
  `insert … on conflict(id) do update … where excluded.updated_at > table.updated_at`, en
  fournissant `updatedAt` explicitement (sinon `$onUpdate` de Drizzle le remplacerait).
  `shortcut: deux transactions serveur qui se croisent peuvent faire manquer une ligne au
  curseur, négligeable à un utilisateur ; passer à un curseur avec chevauchement si ça arrive.`
- Rafraîchissement de `useLiveQuery` (n'écoute que la table racine) : après un pull qui a
  touché `post_collections` ou `collections`, `UPDATE posts SET url = url WHERE id IN (…)`
  en SQL brut — déclenche l'écouteur de `posts` sans modifier `updated_at` (pas de push).
- `sync()` : une seule exécution à la fois (une demande pendant une synchro en relance une
  après). push puis pull. État dans `account-store` (Zustand, état d'interface) :
  `status: 'idle' | 'syncing' | 'error'`, `lastSyncedAt`, `error`.
- Déclencheurs (montés une fois dans `_layout.tsx`, seulement avec une session) : au
  lancement, `AppState` → `active`, et `addDatabaseChangeListener` d'expo-sqlite avec un
  délai de 3 s ; les écritures du pull lui-même sont ignorées (drapeau pendant l'application).
- Hors ligne / erreur réseau : `status: 'error'`, rien d'autre ; nouvel essai au prochain
  déclencheur.

Commit : `feat: push and pull sync engine`.

## Tâche 5 — Connexion, rattachement, déconnexion, suppression

**Fichier** : `src/lib/sync/account.ts`

- `signUp(email, password)` / `signIn(email, password)` → puis `bootstrap(uid)` si
  `sync:<uid>:bootstrapped` absent : pull complet → `planGuestMerge` sur les lignes locales
  `user_id IS NULL` → application (transaction) → push → marque `bootstrapped`.
- `onAuthStateChange` alimente `account-store` (`session`, `email`).
- `signOut()` : `push` ; échec → erreur « Connect to the internet to sign out — some
  changes aren't synced yet. » et on reste connecté. Succès → `supabase.auth.signOut()` →
  `wipeLocalData()` → effacement des clés `sync:<uid>:*`.
- `deleteAccount()` : `rpc('delete_my_account')` → `signOut({ scope: 'local' })` →
  `wipeLocalData()`.
- `wipeLocalData()` : `DELETE FROM post_collections; DELETE FROM posts; DELETE FROM
  collections;` dans une transaction. Commentaire : exception au « jamais de vrai DELETE »,
  justifiée dans la spec (objectif 6) et ARCHITECTURE.md.

Commit : `feat: sign in, guest data merge, sign out and account deletion`.

## Tâche 6 — Interface

**Fichiers** : `src/components/settings-sheet.tsx`, `src/components/account-sheet.tsx`

- Section « Account » des paramètres :
  - déconnecté : ligne « Sign in » (icône `UserRound`) → `AccountSheet` empilée
    (`stackBehavior="push"`, comme `CollectionPickerSheet`) ;
  - connecté : email, ligne d'état (« Synced 2 min ago » / « Syncing… » / message
    d'erreur, appui = relancer), « Sign out », « Delete account » (rouge). Les deux passent
    par `ConfirmDialog` : « Your posts will be removed from this phone. They stay in your
    account. » / « This permanently deletes your account and all its posts. ».
- `AccountSheet` : bascule « Sign in » / « Create account », `SheetField` email
  (`autoComplete="email"`, `keyboardType="email-address"`, `autoCapitalize="none"`) et mot
  de passe (`secureTextEntry`, `autoComplete="password"` / `"new-password"`), bouton plein
  48 px, erreurs traduites (identifiants invalides, email déjà utilisé, mot de passe trop
  court, pas de réseau). Fermeture à la réussite.
- Jetons du système de design uniquement (`design.ts`, `THEME`, `sheet-kit`).

Commit : `feat: account section and sign-in sheet`.

## Tâche 7 — Réveil du projet Supabase

- `.github/workflows/supabase-keepalive.yml` : `schedule` `0 6 */3 * *` + `workflow_dispatch` ;
  une étape `curl -fsS "$SUPABASE_URL/rest/v1/collections?select=id&limit=1" -H "apikey: $SUPABASE_KEY"`.
- Secrets `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` via `gh secret set`.
- Lancer une fois via `gh workflow run` après le push de la branche (demander avant de
  pousser) et vérifier qu'il passe.

Commit : `ci: ping Supabase every 3 days so the free project never pauses`.

## Tâche 8 — Docs

- ARCHITECTURE.md : section synchro (tables serveur, dernière écriture gagnante, curseur
  serveur, déclencheurs, fusion à la connexion) ; exceptions au « jamais de vrai DELETE »
  (vidage local à la déconnexion, suppression de compte côté serveur) ; §2 (session dans le
  kv-store) ; §10 (compte = livré, optionnel).
- DEVELOPMENT.md : `.env.local`, variables EAS, appliquer une migration Supabase,
  réinitialiser un mot de passe depuis le tableau de bord.
- ROADMAP.md (V1.5 synchro livrée, PowerSync écarté et pourquoi), TODO.md (SMTP + domaine
  avant ouverture à d'autres, mot de passe oublié), CHANGELOG `[Non publié]`.

Commit : `docs: document accounts and sync`.

## Tâche 9 — Vérification sur appareil

- Sans compte : l'app se comporte comme avant (rien ne s'affiche en plus hors paramètres).
- Création de compte avec les posts existants → tout est rattaché, visible dans Supabase.
- Modification sur le téléphone → poussée en quelques secondes. Modification simulée d'un
  « autre appareil » (curl avec le jeton du compte, `updated_at` plus récent) → visible sur
  le téléphone après retour au premier plan, liste rafraîchie seule.
- Mode avion : modification, pas d'erreur bloquante ; déconnexion refusée avec le message ;
  réseau revenu → synchro, puis déconnexion → téléphone vide ; reconnexion → tout revient.
- Deuxième compte : ne voit rien du premier.
- Suppression du compte de test → plus rien côté serveur ni sur le téléphone.
- **Ne pas** utiliser le vrai compte de l'utilisateur pour les tests destructifs : compte de
  test dédié, et sauvegarde de la base du téléphone (`run-as … cat files/SQLite/postkeep.db`)
  avant la première connexion.
- `npx expo-doctor@1.20.5` 21/21, doctor RNR, types, lint, tests.
