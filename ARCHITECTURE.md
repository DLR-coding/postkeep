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

**Ce que ça implique concrètement :**

- Aucun écran ne doit attendre le réseau pour s'afficher
- Aucun mur d'inscription — l'utilisateur peut tout faire dès la première ouverture
- Une écriture réussie en base = une écriture définitive du point de vue de l'utilisateur

**Pourquoi** : contrainte produit (l'app doit être utile immédiatement, sans friction) et
contrainte de coût (aucun backend en V1).

---

## 2. Répartition des responsabilités — la règle qui casse le plus souvent

| Type de donnée | Où elle vit | Exemples |
|---|---|---|
| **Données persistantes** | SQLite (via Drizzle) | posts, collections, notes, tags |
| **État d'interface** | Zustand | filtre actif, collection sélectionnée, modale ouverte |
| **État local d'un écran** | `useState` | saisie en cours dans un champ, accordéon ouvert |

🚫 **Ne jamais dupliquer des enregistrements de la base dans un store Zustand.**

C'est l'erreur la plus tentante et la plus coûteuse : deux sources de vérité qui divergent,
des bugs de synchronisation impossibles à reproduire. Si vous avez besoin d'afficher des
données, interrogez la base — ne les copiez pas ailleurs.

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
- Ne jamais faire de `DELETE FROM` — mettre `deleted_at` à jour
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
| **L'URL stockée est normalisée** (query + fragment retirés) | Instagram régénère `?igsh=…` à chaque partage : sans normalisation, deux partages du même post ne se ressemblent pas et la détection de doublon ne se déclenche jamais | Ajouter `url_raw` si une plateforme exige ses paramètres pour s'ouvrir |
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

---

## 5. Pas de TanStack Query en V1

`useLiveQuery` couvre déjà le besoin : observer les changements et re-render. TanStack Query
ferait doublon pour de la donnée purement locale.

TanStack Query reviendra en **V1.5** via `@powersync/react-query`, mais pour un autre besoin :
l'état **réseau** (synchronisation en cours, erreurs de connexion, conflits).

---

## 6. Pas de WebView, pas de récupération de métadonnées en V1

- **Ouvrir un post** → `Linking.openURL()` → le système ouvre Instagram/TikTok directement
- **Aperçu d'un post** → logo de la plateforme, déduit de l'URL (pas d'image récupérée)
- La récupération des métadonnées Open Graph (titre, image) est en réserve, **pas en V1**

**Pourquoi** : une WebView embarquée est lourde, fragile face aux changements des sites, et
souvent bloquée par les plateformes. Récupérer des métadonnées demande du réseau, donc casse
la promesse hors-ligne, et souvent un proxy serveur, donc casse la contrainte de coût zéro.

---

## 7. Navigation

Routing par fichiers avec `expo-router`. Structure actuelle :

```
src/app/
├── _layout.tsx          # Layout racine : providers globaux + Stack
├── +native-intent.tsx   # Redirection des partages entrants (démarrage à froid)
├── shareintent.tsx      # Écran de réception d'un partage (modale)
└── (tabs)/              # Groupe d'onglets
    ├── _layout.tsx
    ├── index.tsx
    └── explore.tsx
```

**Le groupe `(tabs)` est nécessaire**, pas cosmétique : les onglets natifs ne peuvent pas
présenter un écran hors-onglets. Il faut un `Stack` racine qui contienne à la fois le groupe
d'onglets et l'écran `shareintent` en modale.

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
| `nativewind` | 4.2.6 | La v5 supprime `tailwind.config.js` (configuration CSS-first) → le CLI React Native Reusables en dépend et échoue |
| `tailwindcss` | 3.4.19 | La v4 impose la même configuration CSS-first → même conséquence |
| `expo` | ~57.0.16 | Socle validé, `expo-doctor` 21/21. Les patchs du même SDK se suivent avec `npx expo install --fix` — c'est le **mineur** (SDK 58) qui demande une décision |
| `expo-share-intent` | 8.0.1 | Version requise pour SDK 57 (le plugin vérifie et refuse un décalage) |
| `react-native-reanimated` | 4.5.1 | Version fournie par le SDK 57 |
| `react-native-gesture-handler` | 2.32.0 | Idem |

⚠️ **La documentation officielle d'Expo recommande NativeWind v5 pour le SDK 57.
Ne pas la suivre sur ce projet** — elle casse React Native Reusables.

### Compatibilité vérifiée manuellement

`@gorhom/bottom-sheet` v5 est documenté pour **Reanimated v3**, alors que le SDK 57 installe
**Reanimated v4**. Aucune confirmation officielle de compatibilité n'existe. Testé sur
appareil réel pendant l'initialisation : **fonctionne**. À re-tester si l'une des deux
versions bouge.

---

## 9. Distribution

Les builds passent par **EAS Build** (compilation dans le cloud), pas par une chaîne Android
locale — le poste de développement n'a pas besoin d'Android Studio ni du SDK Android.

| Profil | Produit | Usage |
|---|---|---|
| `development` | APK avec dev client | Développement quotidien, se connecte à Metro |
| `preview` | APK autonome | Faire tester à quelqu'un, sans Metro |
| `production` | AAB par défaut | Version finale — voir [TODO.md](./TODO.md), doit produire un APK pour la distribution GitHub |

Le plan EAS gratuit a un **quota mensuel de builds**. Au-delà, les builds sont bloqués
jusqu'au renouvellement (jamais facturés automatiquement). D'où la règle : **grouper les
changements natifs** plutôt que reconstruire à chaque ajout.

---

## 10. Ce qui est volontairement exclu de la V1

Pour éviter de re-débattre à chaque itération :

- Compte utilisateur, backend, synchronisation → V1.5
- WebView, contenus embarqués → jamais prévu
- Récupération de métadonnées Open Graph → réserve
- iOS → après la V1 Android

Le compte utilisateur, quand il arrivera, sera **optionnel** — jamais un mur d'inscription
au lancement.
