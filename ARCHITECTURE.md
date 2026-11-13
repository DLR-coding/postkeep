# Architecture — PostKeep

> Les décisions techniques structurantes et **pourquoi** elles ont été prises.
> Ce document est la référence courante : en cas de contradiction avec `INIT.md`
> (archive de l'initialisation), **c'est ce fichier qui fait foi**.
>
> Une décision listée ici n'est pas une préférence de style : la remettre en cause
> demande de comprendre d'abord la contrainte qui l'a produite.

---

## 1. Local-first : SQLite est la source de vérité

L'app doit fonctionner **hors ligne et sans compte**. Toutes les données vivent dans une base
SQLite sur l'appareil. Il n'y a pas de serveur en V1.

Depuis la V1.5, un **compte optionnel** synchronise cette base avec Supabase (§12). Ça ne
change rien à la règle : la base locale reste la source de vérité pour l'affichage, la
synchro tourne en arrière-plan, et l'app sans compte se comporte exactement comme avant.

**Ce que ça implique concrètement :**

- Aucun écran ne doit attendre le réseau pour s'afficher
- Aucun mur d'inscription — l'utilisateur peut tout faire dès la première ouverture
- Une écriture réussie en base = une écriture définitive du point de vue de l'utilisateur

**Pourquoi** : contrainte produit (l'app doit être utile immédiatement, sans friction) et
contrainte de coût (aucun backend en V1).

**Export** : sans serveur, l'utilisateur doit pouvoir sortir ses données lui-même. Les
Paramètres (`src/components/settings-sheet.tsx`, bouton ⚙ de « All posts ») proposent un
export JSON de tous les posts actifs (`buildExport` dans `src/lib/settings-logic.ts`) :
seulement ce qui a du sens pour l'utilisateur — `url`, `caption`, `note`, noms des
collections, `savedAt` — sans identifiants ni colonnes de synchronisation. Le JSON part en
texte par la feuille de partage Android (`Share.share`), sans écrire de fichier : limite
pratique d'environ 500 Ko via Intent, à remplacer par `expo-file-system` + `expo-sharing` si
la bibliothèque devient très grosse.

---

## 2. Répartition des responsabilités — la règle qui casse le plus souvent

| Type de donnée | Où elle vit | Exemples |
|---|---|---|
| **Données persistantes** | SQLite (via Drizzle) | posts, collections, notes |
| **Préférences de l'appareil** | SQLite, magasin clé-valeur `expo-sqlite/kv-store` | thème (`theme`), affichage liste/grille de « All posts » (`postsLayout`) |
| **Session du compte, état de synchro** | SQLite, magasin clé-valeur `expo-sqlite/kv-store` | session Supabase (écrite par le client lui-même), marques et curseurs `sync:<uid>:*` (§12) |
| **État d'interface** | Zustand (`src/stores/`) | texte de recherche (`nav-search-store.ts`), post ouvert dans la feuille de détail (`post-detail-store.ts`), reflet du compte et de la synchro (`account-store.ts`) |
| **État local d'un écran** | `useState` | saisie en cours dans un champ, filtre de plateforme, accordéon ouvert |

🚫 **Ne jamais dupliquer des enregistrements de la base dans un store Zustand.**

C'est l'erreur la plus tentante et la plus coûteuse : deux sources de vérité qui divergent,
des bugs de synchronisation impossibles à reproduire. Si vous avez besoin d'afficher des
données, interrogez la base — ne les copiez pas ailleurs.

**Préférences de l'appareil : `expo-sqlite/kv-store`, pas Zustand ni une table.**
`src/lib/settings.ts` lit et écrit deux clés en synchrone (`getItemSync` / `setItemSync`) :
`theme` (`system` / `light` / `dark`, appliqué à toute l'app par `Appearance.setColorScheme`,
lu par `useColorScheme` et NativeWind) et `postsLayout` (`list` / `grid`). C'est compatible
avec la règle « données persistantes → SQLite uniquement » : le magasin clé-valeur
d'`expo-sqlite` **est** du SQLite, dans le même module natif, sans dépendance ajoutée (pas
d'AsyncStorage). Ce ne sont pas des tables Drizzle parce que ce sont des réglages propres à
un appareil, pas des données à synchroniser : elles ne portent donc pas les 5 colonnes du §4.
Le décodage des valeurs (repli sur `system` / `list` pour une valeur inconnue) est en logique
pure dans `src/lib/settings-logic.ts`, testée.

**Session du compte : même magasin clé-valeur.** Le client Supabase (`src/lib/supabase.ts`)
reçoit `expo-sqlite/kv-store` comme `storage` : la session (jetons d'accès et de
rafraîchissement) est persistée dans SQLite, sans module natif ajouté ni AsyncStorage. Pas
de chiffrement en plus : le fichier est dans le bac à sable de l'app, et le tutoriel Expo de
Supabase présente le chiffrement comme optionnel. Les marques et curseurs de synchro vivent à
côté, sous des clés préfixées par l'id du compte (`sync:<uid>:…`, §12). `account-store.ts`
(Zustand) n'en est que le reflet pour les écrans : `userId`, `email`, état de la synchro.

**Comment lire les données** : `useLiveQuery` de Drizzle. Le hook observe les changements
SQLite et re-render automatiquement le composant. Pas besoin de gérer un état, pas besoin
de rafraîchir à la main.

```ts
const { data } = useLiveQuery(db.select().from(posts));
```

⚠️ **`useLiveQuery` ne fonctionne que si la base est ouverte avec `enableChangeListener: true`.**
Sans ça, le hook ne réagit à rien et vous chercherez le bug longtemps.

```ts
const sqlite = SQLite.openDatabaseSync('postkeep.db', { enableChangeListener: true });
```

---

## 3. Pourquoi `expo-sqlite` et pas `op-sqlite`

Le projet a d'abord choisi `@op-engineering/op-sqlite`, puis en est revenu. La raison est
instructive et vaut d'être connue avant de proposer de re-changer.

**Raisonnement initial (faux)** : PowerSync — le moteur de synchronisation prévu en V1.5 —
ne fonctionnerait pas avec `expo-sqlite`. Partir sur `op-sqlite` dès la V1 éviterait donc une
migration future.

**Deux erreurs, vérifiées après coup :**

1. **`drizzle-orm/op-sqlite` n'a pas de `useLiveQuery`.** C'est une demande de fonctionnalité
   ouverte chez Drizzle depuis le 8 septembre 2024, toujours non implémentée
   ([drizzle-orm#2926](https://github.com/drizzle-team/drizzle-orm/issues/2926)). La doc
   officielle du driver op-sqlite ne documente que `useMigrations`. Toute la réactivité
   automatique décrite au §2 n'existe tout simplement pas avec ce driver.

2. **La prémisse elle-même était fausse.** PowerSync n'utilise pas la connexion SQLite de
   l'app : il instancie **sa propre** base (`PowerSyncDatabase`). Le bénéfice « zéro migration »
   n'existait donc pas — l'instanciation de la base sera remplacée en V1.5 quel que soit le
   driver de départ. Ce qui survit à la transition, c'est le **schéma Drizzle**, identique
   dans les deux cas.

**Conclusion** : `expo-sqlite` est le chemin documenté et standard, `useLiveQuery` y
fonctionne, et il n'y a aucune perte pour la V1.5.

**Suite (11 novembre 2026)** : PowerSync a finalement été écarté au profit d'une synchro
maison sur `expo-sqlite` (§12). La question du driver ne se pose donc plus.

---

## 4. Schéma de données — 5 colonnes obligatoires

Toute table destinée à être synchronisée un jour **doit** porter ces colonnes **dès la V1**,
même si la synchronisation n'arrive qu'en V1.5.

| Colonne | Type | Raison |
|---|---|---|
| `id` | `TEXT PRIMARY KEY` | **UUID généré côté client.** Jamais d'auto-increment : deux appareils hors ligne généreraient les mêmes identifiants, et la fusion serait impossible |
| `created_at` | `INTEGER` | Horodatage requis par les moteurs de synchronisation |
| `updated_at` | `INTEGER` | Synchronisation delta : permet de savoir quelles lignes ont changé depuis la dernière synchro |
| `deleted_at` | `INTEGER NULL` | **Suppression logique.** Un vrai `DELETE` ne se propage jamais entre appareils : l'autre appareil n'a aucun moyen de savoir que la ligne a existé |
| `user_id` | `TEXT NULL` | Nullable exprès : permet de rattacher a posteriori les données créées avant toute inscription |

**Pourquoi maintenant et pas en V1.5** : migrer le schéma sur des appareils déjà installés,
avec des données réelles dedans, coûte infiniment plus cher que de prévoir cinq colonnes
maintenant.

**Conséquences pratiques :**

- Générer les identifiants côté client (`crypto.randomUUID()` ou équivalent)
- Ne jamais faire de `DELETE FROM` — mettre `deleted_at` à jour. Seules exceptions, voulues
  et limitées au compte : le vidage de l'appareil à la déconnexion et à la suppression du
  compte, et la cascade côté serveur à la suppression du compte (§12)
- **Toutes les requêtes de lecture doivent filtrer `WHERE deleted_at IS NULL`** (piège classique :
  oublier ce filtre et voir réapparaître des éléments supprimés)

### Modèle V1 — décisions arrêtées

Tranchées avant la première migration. Chacune a un chemin de sortie additif : aucune ne
demandera de reconstruire une table sur un appareil contenant déjà des données.

| Décision | Raison | Si ça doit changer |
|---|---|---|
| **Un post peut appartenir à plusieurs collections** — table de jointure `post_collections` | Une même recette a sa place dans « Recettes » *et* dans « Idées repas de famille ». Dupliquer la ligne `posts` pour un second rangement ferait diverger la note entre les copies, et une suppression n'en retirerait qu'une | — |
| **La note est une colonne de `posts`**, pas une table | Plusieurs notes par post n'est pas un besoin démontré | Table `notes` séparée |
| **Pas de table `tags`** | Une collection multiple remplit déjà le rôle d'un tag : depuis que le rangement est N↔N, la notion est redondante | Migration additive si un besoin réellement distinct apparaît |
| **Pas de colonne `platform`** — déduite de l'URL à l'affichage | C'est une fonction pure de l'URL ; la stocker crée une donnée qui divergera le jour où le parser change | Ajouter la colonne quand un filtre SQL par plateforme sera nécessaire |
| **`url` est nullable** | Un partage sans lien exploitable (texte brut) est accepté plutôt que refusé : refuser perd la donnée de l'utilisateur *et* demande un écran d'erreur. Le texte part dans `note`, la carte n'est simplement pas ouvrable | — |
| **L'URL stockée est normalisée** : fragment toujours retiré ; query retirée **seulement pour les plateformes reconnues** (Instagram, TikTok, X, Threads, Reddit — `normalizeUrl` dans `src/lib/share-url.ts`), conservée pour les autres URLs | Instagram régénère `?igsh=…` à chaque partage : sans normalisation, deux partages du même post ne se ressemblent pas et la détection de doublon ne se déclenche jamais. Ailleurs la query peut porter l'identité du contenu (`?v=VIDEO_ID` sur YouTube) : la retirer ferait de toutes les vidéos un seul lien | Ajouter `url_raw` si une plateforme reconnue exige ses paramètres pour s'ouvrir ; ajouter une plateforme à `PLATFORM_HOSTS` seulement si sa query n'est que du tracking |
| **Un post déjà présent est rouvert en édition, pas dupliqué** | Un doublon dans un « cimetière de liens » est le problème que l'app prétend résoudre | — |
| **Ranger un post dans une collection d'où il avait été retiré ressuscite la ligne** de `post_collections` (on vide son `deleted_at`) au lieu d'en insérer une seconde | Sans contrainte `UNIQUE`, insérer à chaque fois accumulerait des lignes mortes pour la même paire au fil des allers-retours. Garantit « une ligne par paire, pour toujours » | — |

⚠️ **Aucune contrainte `UNIQUE`, ni sur `url`, ni sur la paire `(post_id, collection_id)`.**
Avec la suppression logique, la ligne supprimée reste physiquement présente : elle occuperait
la valeur et empêcherait de re-sauvegarder l'URL, ou de reclasser un post dans une collection
d'où il avait été retiré. Les deux vérifications de doublon se font en code, sur les lignes où
`deleted_at IS NULL`.

### Deux niveaux de suppression

Retirer un post d'une collection et le supprimer de l'app sont **deux actions distinctes**,
à deux niveaux différents :

| Action | Écriture | Résultat |
|---|---|---|
| Retirer d'une collection | `deleted_at` sur la ligne `post_collections` | Le post survit, reste dans ses autres collections et dans « Tous les posts » |
| Supprimer de PostKeep | `deleted_at` sur la ligne `posts` | Le post disparaît de partout — l'équivalent du « remove from saved » d'Instagram |

**La suppression d'un post ne cascade pas sur ses rangements** — une seule écriture. Les lignes
`post_collections` deviennent inertes, puisque toute lecture d'une collection joint `posts` et
filtre `posts.deleted_at IS NULL`. Bénéfice concret : un futur « annuler » restitue le post
**avec ses rangements intacts**, ce qu'une cascade aurait détruit.

⚠️ **Le piège qui en découle** : un écran qui lit une collection en ne filtrant que
`post_collections.deleted_at` fera réapparaître les posts supprimés. Le correctif, le jour où
ça arrive, n'est **pas** d'ajouter une cascade mais une fonction de lecture partagée portant
les deux filtres — un seul endroit à corriger plutôt qu'un par écran.

**Conséquence sur l'interface (phase 3)** : le même geste de balayage signifie deux choses
selon l'écran — dans « Tous les posts » il supprime le post, dans une collection il l'en
retire. Les libellés doivent le dire (« Supprimer » vs « Retirer de Recettes »), et supprimer
définitivement depuis une vue collection doit passer par un chemin explicite (appui long, ou
le détail du post).

**Génération des identifiants** : `newId()` dans `src/db/index.ts`, qui délègue au générateur
UUID natif d'`expo-modules-core` (déjà présent, aucune dépendance ajoutée). Les colonnes `id`
n'ont volontairement **pas** de valeur par défaut côté Drizzle : TypeScript force alors à
passer un `id` à chaque insertion, et un oubli est une erreur de compilation.

### Ordre des listes : date d'enregistrement

Toutes les listes de posts (« All posts », une collection, « Sans collection ») et les
aperçus des dossiers sont triés par **`created_at` décroissant** (`orderBy(desc(posts.createdAt))`
dans `src/db/posts.ts` et `src/db/collections.ts`). C'est la date affichée sur les cartes de la liste
(`formatPostDate`, `src/components/post-card.tsx`) : un tri par `updated_at` faisait remonter en tête un vieux post simplement
édité, avec une date ancienne — incohérent à l'écran. `updated_at` reste réservé à la
synchronisation.

---

## 5. Pas de TanStack Query en V1

`useLiveQuery` couvre déjà le besoin : observer les changements et re-render. TanStack Query
ferait doublon pour de la donnée purement locale.

Il était prévu de l'ajouter en **V1.5** via `@powersync/react-query` pour l'état **réseau**
(synchronisation en cours, erreurs). PowerSync écarté (§12), ce besoin tient en trois
champs (`status`, `lastSyncedAt`, `error`) dans `src/stores/account-store.ts` : toujours pas
de TanStack Query.

---

## 6. Métadonnées (légende + miniature) récupérées sur l'appareil

- **Ouvrir un post** → `Linking.openURL()` → le système ouvre Instagram/TikTok directement
- **Aperçu d'un post** → miniature + caption quand disponibles, sinon badge de plateforme
- **Récupération** : à l'enregistrement depuis l'écran de partage
  (`src/screens/save-post/form.tsx`), aiguillée par plateforme. Le post est **écrit avant**
  la récupération, puis complété (`setPostMetadata`) : si l'app passe en arrière-plan pendant
  « Saving… » (Android y gèle les timers JS) ou est tuée, le post n'est pas perdu. Un échec
  n'empêche jamais la sauvegarde : toutes les méthodes résolvent à vide plutôt que d'échouer.
  Résultat stocké dans `posts.caption` / `posts.thumbnail_url` ; un échec (`null`) n'efface
  pas les métadonnées déjà enregistrées.
- **Rattrapage** (`src/components/metadata-backfill.tsx`) : au lancement et à chaque retour
  au premier plan, les posts Instagram/TikTok sans miniature sont repassés dans la WebView,
  un à la fois, au plus 3 essais par post (`MAX_ATTEMPTS`, `src/lib/metadata-backfill.ts`).
  Compteur dans le kv-store local (clé `metadata-backfill-attempts`), pas synchronisé : un
  nombre d'essais n'a pas de sens sur un autre appareil. Un essai interrompu (app quittée,
  partage arrivé) ne compte pas. Les miniatures expirées (URL signée) ne sont pas rattrapées.

### État de la récupération par plateforme (novembre 2026)

| Plateforme | Caption | Miniature | Méthode |
|---|---|---|---|
| **Instagram** | ✅ | ✅ | WebView cachée (`src/lib/webview-metadata.tsx`) |
| **TikTok** | ✅ | ✅ | WebView cachée (`src/lib/webview-metadata.tsx`) |
| **X (Twitter)** | ✅ | ❌ | oEmbed (`api.twitter.com/1/statuses/oembed.json`, `fetchOEmbed` dans `src/lib/oembed.ts`) : texte du tweet seulement |
| **Reddit** | ✅ | ✅ | Flux RSS public du post (`<permalien>/.rss`, `fetchOEmbed` dans `src/lib/oembed.ts`, User-Agent `PostKeep/0.3 (Android app)`) : titre de l'entrée + `media:thumbnail`. Si rien (lien court `redd.it`/`/s/`, refus 403/429) : oEmbed officiel, titre seul. Écartés (vérifiés le 11 novembre 2026 depuis le téléphone) : `.json` public → 403 ; page HTML → vérification anti-bot, qu'on ne contourne pas |
| **Threads** | ❌ | ❌ | Jamais supporté |
| **Autres** (YouTube, articles…) | ❌ | ❌ | Aucune récupération |

Les cases ❌ de la colonne Caption ne laissent pas forcément la légende vide : pour **toutes**
les plateformes, faute de métadonnées, la légende retombe sur le titre fourni par l'intention
de partage Android (`shareIntent.meta.title`), puis sur le texte partagé débarrassé de ses
URLs (`extractCaptionFromText` dans `src/lib/share-url.ts`).

### Pourquoi une WebView ?

Instagram et TikTok ne servent pas les balises `og:*` dans le HTML initial — elles sont
rendues côté client via JavaScript. Un simple `fetch()` ne voit rien, même avec un
User-Agent mobile.

**Approches testées et abandonnées :**
1. **oEmbed officiel** — ne renvoie plus les métadonnées
2. **Scraping HTML statique** — les og: tags ne sont pas dans le HTML initial
3. **Supabase Edge Function** — abandonnée : Instagram/TikTok bloquent les IP de datacenter,
   alors qu'une requête partie du téléphone (IP mobile/résidentielle) passe. D'où une
   récupération sur l'appareil, qui respecte aussi le « pas de serveur en V1 » (§1)
4. **Share intent Android** — Instagram/TikTok n'envoient que l'URL brute

`scrapeMetaTags` (approche 2) a été supprimé de `src/lib/oembed.ts` le 11 novembre 2026 :
`fetchOEmbed` ne traite plus que X et renvoie vide pour tout le reste.

**Solution retenue** : `react-native-webview` en mode invisible (1×1 px, positionné hors
écran, `incognito`, sans cache ni lecture automatique des médias). La page est chargée avec un
User-Agent mobile ; à `onLoadEnd`, un script injecté interroge les balises `og:image` et
`og:description` (repli `og:title`) toutes les 200 ms pendant au plus 5 s, puis renvoie le
résultat via `postMessage`. Délai global de 10 secondes. Une seule extraction à la fois, la
plus récente gagne : la requête en cours reçoit un résultat vide (un partage passe devant le
rattrapage), et la WebView est remontée à chaque URL. Les navigations hors `http(s)`/`about:`
sont refusées sans être ouvertes : la page Instagram redirige vers `instagram://media/…`, que
`react-native-webview` ouvrirait sinon via `Linking` (l'app Instagram passait devant PostKeep).

Architecture :
```
MetadataExtractorProvider (dans _layout.tsx)
  └─ WebView invisible (créée à la demande)
       ├─ charge l'URL
       ├─ onLoadEnd → injecte le JS d'extraction
       └─ postMessage → retourne { caption, thumbnailUrl }
```

---

## 7. Navigation

Routing par fichiers avec `expo-router`. Structure actuelle :

```
src/app/
├── _layout.tsx          # Layout racine : providers globaux + Stack + feuille de détail
├── +native-intent.tsx   # Redirection des partages entrants (démarrage à froid)
├── shareintent.tsx      # Écran de réception d'un partage (modale)
├── collection/[id].tsx  # Posts d'une collection (écran empilé)
└── (tabs)/              # Groupe d'onglets
    ├── _layout.tsx      # Onglets JS + barre flottante GlassTabBar
    ├── index.tsx        # All posts
    └── collections.tsx  # Collections (dossiers)
```

**Le groupe `(tabs)` est nécessaire**, pas cosmétique : il faut un `Stack` racine qui contienne
à la fois le groupe d'onglets et les écrans hors onglets (`shareintent` en modale,
`collection/[id]`).

**Barre d'onglets (refonte du 10 novembre 2026)** : `NativeTabs` a été remplacé par les onglets
JS d'`expo-router` (`expo-router/js-tabs`, `tabBar={() => null}`) et une barre dessinée par
l'app, `src/components/glass-tab-bar.tsx` (recherche + onglets Posts / Collections). Raisons et
pièges :

- La barre native ne peut contenir ni champ de recherche ni verre dépoli.
- Sur Android, `expo-blur` exige que le `BlurView` soit **à côté** de sa cible
  `BlurTargetView`, pas dedans : la barre est donc rendue en frère du `BlurTargetView` qui
  enveloppe les onglets, et lit l'onglet actif via `usePathname` (navigation par
  `router.navigate`).
- **Verre liquide** (repris de budget-app) : `src/components/liquid-glass.ts` (shader SkSL,
  modèle « V2 » de webgl-apple-liquid-glass, MIT) réfracte une capture en direct du
  `BlurTargetView` (`src/components/glass-backdrop.ts`, `react-native-webgpu`
  `drawElementImageToTexture`, 3 textures en rotation). Skia ne voit pas les vues natives,
  d'où la capture ; la barre étant hors du conteneur capturé, elle ne se capture pas
  elle-même. Deux surfaces : la pilule des onglets (avec la bulle qui glisse, tête + traîne ;
  un `PanResponder` sur la pilule la fait gonfler sous le doigt et le suivre, puis la cale sur
  l'onglet le plus proche au relâchement — les onglets restent accessibles par l'action
  « activate »)
  et la pilule de recherche. Le flou `expo-blur` reste en repli tant que la première capture
  n'est pas prête, ou sans GPU. Matériau, voiles et ressorts réglables dans l'écran
  « Liquid glass » (Settings → Liquid glass, `src/screens/glass`), onglet caché pour que la
  barre reste visible pendant qu'on règle ; valeurs (`src/lib/glass-settings.ts`, défauts =
  réglages finaux de budget-app) dans une valeur partagée lue à chaque image, enregistrées
  dans le kv-store local (clé `glass-settings`, pas synchronisée).
- En edge-to-edge la fenêtre n'est pas redimensionnée par le clavier : la barre suit le clavier
  avec `useAnimatedKeyboard` (Reanimated).
- Le texte de recherche vit dans un store d'interface (`src/stores/nav-search-store.ts`), vidé à
  chaque changement d'onglet.

Conception et plan : `docs/superpowers/specs/2026-11-10-refonte-ui-design.md`,
`docs/superpowers/plans/2026-11-10-refonte-ui.md`.

### Réception d'un partage : deux chemins distincts

C'est un piège qui a réellement coûté du temps — les deux sont nécessaires :

| Situation | Mécanisme |
|---|---|
| L'app était **fermée** (démarrage à froid) | `+native-intent.tsx` intercepte l'URL entrante et redirige vers `/shareintent` |
| L'app tournait **déjà** (en arrière-plan) | `ShareIntentProvider` monté à la racine détecte le nouveau partage et navigue |

Android relance l'activité existante (`launchMode: singleTask`) au lieu d'en créer une
nouvelle quand l'app tourne déjà : `+native-intent.tsx` n'est alors **jamais appelé**. Sans
le provider racine, le partage arrive mais rien ne se passe.

---

## 8. Versions épinglées — ne pas mettre à jour sans lire ceci

| Paquet | Version | Pourquoi c'est figé |
|---|---|---|
| `nativewind` | 4.2.7 | La v5 supprime `tailwind.config.js` (configuration CSS-first) → le CLI React Native Reusables en dépend et échoue. Patch 4.2.6 → 4.2.7 (avec `react-native-css-interop` 0.2.7) validé le 11 novembre 2026 pour le SDK 58 |
| `tailwindcss` | 3.4.19 | La v4 impose la même configuration CSS-first → même conséquence |
| `expo` | ~58.0.25 | Socle SDK 58 (React Native 0.88.1, React 19.3.0), `expo-doctor` 20/20. Les patchs du même SDK se suivent avec `npx expo install --fix` — c'est le **mineur** (SDK 59) qui demande une décision |
| `expo-share-intent` | 9.0.0 | Version requise pour SDK 58 (la 8.0.1 exige `expo` ^57 en peer et bloque `npm install` ; le plugin vérifie et refuse un décalage) |
| `react-native-reanimated` | 4.7.1 | Version fournie par le SDK 58 |
| `react-native-gesture-handler` | ~3.3.0 | Version fournie par le SDK 58. Majeure : `Swipeable` a disparu, `post-card.tsx` utilise `ReanimatedSwipeable` (`react-native-gesture-handler/ReanimatedSwipeable`) |
| `expo-blur` | ~58.0.6 | Module natif (refonte) : flou de la barre flottante. Sur Android, `BlurTargetView` + `blurTarget`, `blurMethod="dimezisBlurViewSdk31Plus"` |
| `react-native-skia` | 3.9.1 | Skia **v3** (paquet `react-native-skia`, pas `@shopify/react-native-skia` 2.x que propose le SDK 58) : verre liquide de la barre flottante. Mêmes versions que budget-app (RN 0.88.1, Reanimated 4.7.1, Worklets 0.13.0), où il tourne. Build natif lourd : voir DEVELOPMENT.md §7 |
| `react-native-webgpu` | 0.21.1 | Capture en direct de l'écran derrière la barre (`drawElementImageToTexture`). Exige `minSdkVersion` 26 (plugin `expo-build-properties`) |
| `react-native-webview` | 14.0.1 | Version fournie par le SDK 58. Module natif : lecture des balises `og:` d'Instagram/TikTok dans une WebView cachée (`src/lib/webview-metadata.tsx`). Ses types racine déclarent `class WebView<P = undefined>` → props `never` : contourné par `WebView<object>` (commentaire `shortcut:`), à retirer quand les types upstream seront corrigés |
| `react-native-svg` | 15.16.0 | Version fournie par le SDK 58. Module natif : dégradés de la refonte (sticker Instagram, fonds de repli Instagram/TikTok des vignettes et de la feuille de détail, voile sous le texte d'une case de la grille) |

Les autres modules natifs (`react-native-keyboard-controller` 1.22.7, `@shopify/flash-list`
2.3.2, `react-native-worklets` 0.13.0, paquets `expo-*`) suivent aussi les versions du SDK 58 :
toujours les ajouter ou les mettre à jour avec `npx expo install`, et grouper ces ajouts avant
un build (§9).

⚠️ **La documentation officielle d'Expo recommande NativeWind v5 pour le SDK 58.
Ne pas la suivre sur ce projet** — elle casse React Native Reusables.

Avec React Native 0.88, la ref d'une `View` se type `ComponentRef<typeof View>`
(`ReactNativeElement`), plus `View` (voir `src/app/(tabs)/_layout.tsx`).

Depuis le SDK 58, les builds **release** activent la minification R8 par défaut : pas encore
vérifiée sur un APK release (voir TODO.md).

### Compatibilité vérifiée manuellement

`@gorhom/bottom-sheet` v5 est documenté pour **Reanimated v3**, alors que le SDK 57 installait
déjà **Reanimated v4**. Aucune confirmation officielle de compatibilité n'existe. Testé sur
appareil réel pendant l'initialisation : **fonctionne**. À re-tester si l'une des deux
versions bouge.

⚠️ **`@gorhom/bottom-sheet` 5.2.14 × gesture-handler 3 (SDK 58)** : aucun support officiel de
gesture-handler 3. D'après l'issue upstream #2793, la bibliothèque fonctionne, mais ses types
de ref pour `BottomSheetTextInput` sont faux sous gesture-handler 3 → cast `shortcut:` dans
`src/components/account-sheet.tsx`. **Pas encore testé sur appareil** avec le SDK 58 : à
vérifier en priorité sur le nouveau dev build (ouverture, glissement, saisie au clavier).

---

## 9. Distribution

Les builds passent par **EAS Build** (compilation dans le cloud), pas par une chaîne Android
locale — le poste de développement n'a pas besoin d'Android Studio ni du SDK Android.

| Profil | Produit | Usage |
|---|---|---|
| `development` | APK avec dev client (`developmentClient: true`, `expo-dev-client`) | Développement uniquement. Le JS **n'est pas** dans l'APK : il vient de Metro sur le PC. Sans PC, l'app reste sur l'écran du launcher |
| `preview` | APK autonome (`distribution: internal`) | Faire tester à quelqu'un, sans Metro. N'apparaît que dans Activity/Builds du tableau de bord Expo |
| `production` | APK autonome (`buildType: apk`), JS embarqué | **L'APK d'usage quotidien** et celui des GitHub Releases. Le tableau de bord Expo l'affiche « Android Play Store build » (distribution store par défaut) même s'il n'est envoyé à aucun store |

Les trois profils produisent le même package (`com.thejohninc.postkeep`), signé avec la même
clé EAS : installer l'un par-dessus l'autre **conserve les données**. Expo Go n'est pas
utilisable : `expo-share-intent` contient du code natif.

EAS builde depuis le `HEAD` git : committer avant `eas build`. Les artefacts EAS expirent
(un build de deux mois est « Expired ») — c'est la GitHub Release qui conserve l'APK.

`.env.local` n'est pas commité, donc pas envoyé à EAS : chaque profil d'`eas.json` désigne
son environnement EAS (`"environment": "development"` / `"preview"` / `"production"`), où
sont définies `EXPO_PUBLIC_SUPABASE_URL` et `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
(DEVELOPMENT.md §7). Sans elles, `src/lib/supabase.ts` lève une erreur au démarrage.

Le plan EAS gratuit a un **quota mensuel de builds** (15 builds Android). Au-delà, les builds
sont bloqués jusqu'au renouvellement (jamais facturés automatiquement). D'où la règle :
**grouper les changements natifs** plutôt que reconstruire à chaque ajout.

---

## 10. Ce qui est volontairement exclu de la V1

Pour éviter de re-débattre à chaque itération :

- Compte utilisateur, backend, synchronisation → V1.5 : **livré** (branche
  `feat/account-sync`, §12), compte **optionnel**
- Contenus embarqués (lire le post dans l'app) → jamais prévu : lourd, fragile, souvent
  bloqué par les plateformes. La seule WebView de l'app est invisible et sert uniquement à
  lire légende et miniature au partage (§6)
- Récupération de métadonnées côté serveur → exclue : IP de datacenter bloquées (Edge
  Function Supabase testée et abandonnée) et contrainte de coût zéro. Les métadonnées sont
  lues sur l'appareil, une seule fois, au partage (§6)
- iOS → après la V1 Android

Le compte utilisateur est **optionnel** — jamais un mur d'inscription au lancement, ni de
rappel insistant : il ne se montre que dans la section « Account » des Paramètres.

---

## 11. Système de design (refonte de novembre 2026)

Conception : `docs/superpowers/specs/2026-11-10-refonte-ui-design.md`. Le but est qu'un
nouvel écran n'invente ni rayon, ni hauteur, ni couleur : tout passe par des jetons partagés.

**Forme et espacement** — `src/lib/design.ts` :

| Jeton | Valeurs |
|---|---|
| `RADIUS` | `inset` 12 (petits encarts), `control` 16 (champs et boutons), `card` 24 (cartes, dossiers), `sheet` 28 (haut des feuilles du bas) |
| `SPACE` | `xs` 4, `sm` 8, `md` 12, `lg` 16, `xl` 24 |
| `CONTROL_HEIGHT` | 48 — champs et boutons ont la même hauteur |

**Couleurs** — jetons de thème définis à trois endroits **à garder synchronisés à la main** :

- `global.css` : variables CSS, `:root` (clair) et `.dark:root` (sombre) ;
- `tailwind.config.js` : expose ces variables aux classes NativeWind (`bg-surface`,
  `glass`, etc.) ;
- `THEME` dans `src/lib/theme.ts` : mêmes valeurs en JS, pour ce qui ne prend pas de
  `className` (couleurs d'icônes, `react-native-svg`, `style`, `backgroundStyle` des
  feuilles).

**Composants partagés** :

- `src/components/sheet-kit.tsx` — `sheetBackgroundStyle` (fond et coins des feuilles du
  bas), `SheetField` (champ texte de feuille, 48 px), `SheetActions` (rangée de boutons),
  `ConfirmDialog` (confirmation au style de l'app) ;
- `src/components/collection-chip.tsx` + `src/lib/collection-tint.ts` — puce de collection
  avec une teinte pastel déduite du nom : stable d'un écran à l'autre sans rien stocker en
  base.

**`ConfirmDialog` remplace tous les `Alert.alert`** (suppression d'un post en édition, au
balayage, suppression d'une collection) : la boîte native d'Android ne suit ni le thème ni
le système de design. Il est rendu par portail (`@rn-primitives/portal`) :

- par défaut dans le `PortalHost` racine de `src/app/_layout.tsx` ;
- **depuis la feuille de détail plein écran** (`src/components/post-detail-sheet.tsx`), dans
  un `PortalHost` dédié monté *dans* la feuille (`SHEET_PORTAL`, passé via `portalHost`).
  Sans ça, le dialogue serait dessiné sous la feuille, le portail racine étant plus bas
  qu'elle dans l'arbre.

Connu et accepté : en édition, le pied de la feuille n'est pas assombri sous le dialogue de
suppression.

---

## 12. Compte et synchronisation (V1.5, novembre 2026)

Conception : `docs/superpowers/specs/2026-11-11-comptes-synchro-design.md` ; plan :
`docs/superpowers/plans/2026-11-11-comptes-synchro.md`. Le code fait foi là où il diverge
du plan (marque de push, rattachement avant chaque push, déconnexion) : les écarts sont
expliqués en place ci-dessous.

Un compte **optionnel** (email + mot de passe) sauvegarde posts et collections dans
Supabase et les synchronise entre les appareils **du même compte**. Pas de partage entre
personnes, pas de temps réel.

### Décision : synchro maison, pas PowerSync

PowerSync était la piste de la roadmap. Écarté le 11 novembre 2026 au profit d'une synchro
maison sur les colonnes du §4 :

- PowerSync instancie **sa propre** base (§3) : il aurait fallu remplacer la connexion
  `expo-sqlite` de l'app, donc la réactivité `useLiveQuery` de Drizzle sur laquelle reposent
  tous les écrans (§2) ;
- il ajoute un module natif (nouveau build, §9) et un service de plus entre l'app et
  Postgres, à configurer et à garder dans un tier gratuit ;
- le besoin est petit : un seul utilisateur par compte, trois tables qui portent déjà
  `updated_at` / `deleted_at` / `user_id`. Un push/pull par delta avec « dernière écriture
  gagnante » suffit, et sa logique se teste en pur avec `node --test`.

Résultat : `@supabase/supabase-js` seul, **100 % JavaScript** — aucun module natif ajouté,
aucun build nécessaire.

### Côté serveur (Supabase)

Migration : `supabase/migrations/20261111000000_account_sync.sql`.

- Tables `collections`, `posts`, `post_collections` : mêmes colonnes qu'en local, dates en
  millisecondes (`bigint`), plus `user_id uuid not null references auth.users on delete
  cascade` et **`server_updated_at`** (heure du serveur à chaque écriture réelle, curseur
  du pull, indépendant des horloges des téléphones). Clés étrangères `post_collections` →
  `posts` / `collections` : d'où l'ordre fixe `collections`, `posts`, `post_collections` au
  push comme au pull.
- **Dernière écriture gagnante** : trigger `sync_last_write_wins` (`BEFORE INSERT OR
  UPDATE`). Une mise à jour dont `updated_at` n'est pas plus récent que la ligne en place
  est ignorée **sans erreur** : l'upsert réussit, la ligne est simplement absente de la
  réponse et inchangée en base. C'est aussi ce qui empêche le rebond entre appareils (une
  ligne renvoyée telle qu'elle a été reçue ne « rajeunit » pas).
- **RLS** sur les trois tables, politique « own rows » : `user_id = auth.uid()` pour toute
  opération de `authenticated`.
- **Droits** : ce projet Supabase accorde par défaut **tous** les droits (`DELETE` compris)
  à `anon` et `authenticated` sur toute nouvelle table de `public`. La migration fait donc
  `revoke all` puis accorde seulement `select, insert, update` à `authenticated` — pas de
  `DELETE` (suppression logique, §4) — et `select` sur `collections` à `anon` pour le ping de
  réveil (la RLS ne lui renvoie aucune ligne). **Toute nouvelle table synchronisée doit
  reprendre ce `revoke` / `grant`.**
- `delete_my_account()` (`security definer`, exécutable par `authenticated` seulement) :
  supprime l'utilisateur d'`auth.users`, ses lignes partent en cascade.
- Réglages d'authentification : `mailer_autoconfirm: true` (pas de confirmation d'email) et
  `password_min_length: 8`. Raison : le service d'email intégré de Supabase n'envoie qu'aux
  membres de l'équipe du projet, 2 emails par heure — avec la confirmation, personne d'autre
  ne pourrait s'inscrire. Conséquences : pas de « mot de passe oublié » (réinitialisation à
  la main, DEVELOPMENT.md), et rien ne prouve que l'adresse appartient à celui qui
  s'inscrit. Un SMTP + un domaine sont à brancher avant d'ouvrir l'app à d'autres (TODO).

### Côté appareil

| Fichier | Rôle |
|---|---|
| `src/lib/supabase.ts` | Client Supabase : session dans le kv-store (§2), rafraîchissement du jeton au premier plan seulement |
| `src/lib/sync/logic.ts` | Logique pure, testée : conversion des lignes, comparaison `updated_at`, curseur, plan de fusion des invités, messages d'erreur |
| `src/lib/sync/engine.ts` | I/O : push, pull, fusion, `sync()` |
| `src/lib/sync/account.ts` | Connexion, inscription, déconnexion, suppression du compte |
| `src/hooks/use-account-sync.ts` | Session → `account-store`, déclencheurs de synchro (monté une fois dans `_layout.tsx`) |
| `src/components/settings-sheet.tsx`, `account-sheet.tsx` | Section « Account » des Paramètres, feuille de connexion |

Clés du kv-store, par compte : `sync:<uid>:push` (marque de push), `sync:<uid>:pull:<table>`
(curseur de pull), `sync:<uid>:bootstrapped` (première synchro faite sur cet appareil).

**Push** (`push(uid)`) :

1. **Rattachement** : toute ligne locale `user_id IS NULL`, des trois tables, pierres
   tombales comprises, reçoit `user_id = uid` et `updated_at = maintenant`. Fait avant
   **chaque** push, pas seulement à la connexion : les écritures locales ne posent jamais
   `user_id`, donc une ligne créée pendant la session est aussi « sans compte ».
2. Envoi (upsert sur `id`, paquets de 500) des lignes `user_id = uid` et
   `updated_at >= marque`.
3. Marque = **heure de l'appareil au début du push**, enregistrée après succès. Pas le plus
   grand `updated_at` envoyé : une ligne reçue d'un téléphone à l'horloge en avance aurait
   porté la marque dans le futur, et les modifications locales suivantes ne seraient plus
   parties. `>=` plutôt que `>` : une écriture dans la même milliseconde repart au push
   suivant (le serveur ignore le doublon).

**Pull** (`pull(uid)`) : par table, pages de 500 triées `(server_updated_at, id)` après le
curseur. Le `ts` du curseur reste la **chaîne** renvoyée par le serveur (un `Date` JS
perdrait les microsecondes). Application en transaction :
`insert … on conflict(id) do update … where excluded.updated_at > updated_at`, avec
`updated_at` fourni explicitement (sinon `$onUpdate` de Drizzle le remplacerait).

**Rafraîchissement des écrans** : `useLiveQuery` n'écoute que la table racine de sa requête ;
un rangement reçu seul ne rafraîchirait ni les listes ni les compteurs. Après un pull qui a
changé quelque chose, une ligne de `posts` et une de `collections` sont réécrites à
l'identique (`UPDATE posts SET url = url WHERE id IN (SELECT id FROM posts LIMIT 1)`, idem
`collections.name`) : chaque écouteur est notifié, `updated_at` ne bouge pas, donc pas de push.

**Première synchro d'un compte sur l'appareil** (`sync:<uid>:bootstrapped` absent) : marque de
push posée à maintenant → pull complet → **fusion des invités** (`planGuestMerge`) → push →
`bootstrapped`. La fusion évite les doublons quand on a utilisé l'app sans compte sur deux
téléphones : une collection invitée du même nom (casse et espaces ignorés) qu'une du compte
y est fusionnée ; un post invité de même URL qu'un du compte aussi (rangements repointés sans
doublon de paire, notes accolées si elles diffèrent) ; la copie invitée passe en
`deleted_at`. Hors de ce moment, un même post sauvegardé hors ligne sur deux appareils peut
donner un doublon : accepté. Cette première synchro part des déclencheurs dès que la session
apparaît, pas de `signIn()` lui-même.

**`sync()`** : push puis pull, une seule exécution à la fois (une demande pendant une synchro
en relance une après). N'échoue jamais : l'erreur va dans `account-store`
(`status: 'error'`), nouvel essai au prochain déclencheur. Hors ligne, rien ne casse.

**Déclencheurs** (seulement avec une session, après les migrations) : au lancement et à la
connexion, au retour au premier plan, et 3 s après une écriture en base
(`addDatabaseChangeListener`) — **seulement si `hasLocalChanges(uid)`** (ligne sans
`user_id`, ou ligne du compte avec `updated_at >= marque`). Ce filtre empêche les écritures
du pull de relancer une synchro en boucle ; une ligne reçue plus récente que la marque en
relance une seule, qui la renvoie, que le serveur ignore : ça converge.

**Déconnexion** (`signOut()`) : synchro complète (push **et** pull) d'abord. Échec → erreur
« Connect to the internet to sign out — some changes aren't synced yet. », on reste connecté
(aucune écriture non poussée n'est perdue). Succès → `supabase.auth.signOut({ scope: 'local' })`
→ vidage local. `scope: 'local'` et non `global` : `global` déconnecterait aussi les autres
appareils du compte, et la sortie ne doit plus dépendre du réseau une fois tout poussé.

**Suppression du compte** (`deleteAccount()`) : attend la fin d'une synchro en cours (elle
réécrirait des lignes après le nettoyage), `rpc('delete_my_account')`, `signOut` local (le
jeton d'un compte supprimé reste valide jusqu'à expiration), vidage local.

### Exceptions à « jamais de vrai `DELETE` »

| Où | Quoi | Pourquoi ce n'est pas une perte |
|---|---|---|
| Appareil, déconnexion et suppression du compte | `DELETE` des trois tables locales (`wipeLocalData`, `src/lib/sync/account.ts`) + oubli des clés `sync:<uid>:*` | À la déconnexion, tout est poussé avant : les données restent dans le compte, pierres tombales comprises. C'est le cache de l'appareil qu'on vide |
| Serveur, suppression du compte | `delete from auth.users`, cascade sur les trois tables | Voulu : droit à l'effacement, confirmé par un `ConfirmDialog` destructif |

Partout ailleurs, la règle du §4 tient, y compris côté serveur (aucun droit `DELETE`).

### Réveil du projet Supabase

Le tier gratuit se met en pause après 7 jours sans requête.
`.github/workflows/supabase-keepalive.yml` lit `collections` avec la clé publishable tous les
3 jours (`0 6 */3 * *`, plus lancement manuel) ; secrets GitHub `SUPABASE_URL` et
`SUPABASE_PUBLISHABLE_KEY`. Limite : GitHub désactive un workflow planifié après 60 jours
sans activité sur le dépôt (DEVELOPMENT.md). S'il s'arrête, la synchro échoue proprement
jusqu'à la remise en route du projet depuis le tableau de bord.

### Risques connus, acceptés

- **Horloges des appareils** : la dernière écriture gagnante compare des `updated_at` pris
  sur les téléphones. Un téléphone en retard perd face à une modification plus ancienne mais
  horodatée plus tard. Accepté : un compte n'est modifié que par une personne.
- **Transactions serveur qui se croisent** : le curseur peut manquer une ligne validée après
  une plus récente (`shortcut:` dans `engine.ts`). Négligeable à un utilisateur.
- **Session terminée sans notre `signOut()`** (jeton de rafraîchissement révoqué, par
  exemple) : les lignes de l'ancien compte restent sur le téléphone et s'afficheraient sous
  un autre compte connecté ensuite (les lectures ne filtrent pas sur `user_id`). Corrigé le
  11 novembre 2026 : la première synchro d'un compte sur l'appareil supprime d'abord les
  lignes d'un autre `user_id` (`dropOtherAccountRows`, `engine.ts`). Seules leurs
  modifications jamais poussées sont perdues. En mode sans compte, elles restent visibles
  jusqu'à la prochaine connexion.
