# Changelog

Toutes les modifications notables du projet sont consignées ici.

Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/).
Le projet suivra [SemVer](https://semver.org/lang/fr/) à partir de la première version publiée.

**Catégories** : `Ajouté` · `Modifié` · `Déprécié` · `Retiré` · `Corrigé` · `Sécurité`

> **Quand écrire ici ?** Dès qu'un changement est visible par l'utilisateur, ou qu'il modifie
> la façon de travailler sur le projet (dépendance, configuration, conventions). Un
> refactoring interne sans effet observable n'a pas besoin d'entrée.

---

## [Non publié]

Aucune version n'a encore été distribuée — voir [ROADMAP.md](./ROADMAP.md).

### Ajouté

- **Consultation des posts sauvegardés** (Phase 3) : liste (`@shopify/flash-list`,
  `(tabs)/index.tsx`), carte de post (`src/components/post-card.tsx` — plateforme, note,
  badges de collection tronqués à 3 + `+N`, date), état vide soigné
  - **Sheet de détail/édition fusionnée** (`src/components/post-detail-sheet.tsx`), pattern
    « Now Playing » : une seule `BottomSheetModal` à deux snap points (50 % aperçu, 100 %
    édition), plus de route séparée `post/[id]/edit`. Coins et poignée animés sur
    `animatedIndex`, `topInset={0}`, bouton retour Android re-snap plutôt que fermeture en
    plein écran. Ouverture d'un post (`Linking.openURL()`, pas de WebView) via le bouton
    « Ouvrir dans X » de l'aperçu plutôt qu'au tap direct sur la carte
  - **Suppression logique à deux niveaux** : balayage = suppression réelle dans « Tous les
    posts »/« Sans collection », retrait de la collection courante uniquement dans une vraie
    vue collection (2 actions distinctes, « Retirer »/« Supprimer »), suppression réelle
    toujours possible via un second bouton
  - Collections sous Note en mode édition : chips retirables horizontales
    (`PostFieldsForm` prop `variant: 'chips'`), picker complet ouvert dans une feuille
    empilée (`stackBehavior="push"`)
- **Onglet Collections** (Phase 4, remplace `(tabs)/explore.tsx`) : grille de tuiles
  (`FlashList numColumns={3}`, `src/screens/collections/`), pseudo-dossier « Sans collection »,
  navigation vers une collection (`src/screens/collection/`, réutilise `PostCard` + `FlashList`
  filtrés par `collectionId`), recherche sur les noms de collection, création (bouton flottant
  « + ») et renommage/suppression (appui long → feuille d'actions + `Dialog` de confirmation,
  composant React Native Reusables ajouté) — tous stylés custom plutôt qu'`Alert.alert`/
  `@expo/ui` (natifs, jugés visuellement décalés du reste de l'app)
- **Écran de sauvegarde d'un post** (`src/screens/save-post/`) : reçoit un partage, propose les
  collections en cases à cocher (création à la volée via un bouton dédié), un champ note, puis
  enregistre et referme l'app vers l'app d'origine (`BackHandler.exitApp()`) après une
  confirmation (`react-native-toast-message` + `expo-haptics`)
  - Un post déjà partagé (même URL normalisée) se rouvre en édition — note et collections
    préremplies — plutôt que de se dupliquer
  - `src/lib/share-url.ts` : détection de plateforme (Instagram/TikTok/X/Threads) et
    normalisation d'URL (query + fragment retirés), logique pure testée
    (`src/lib/share-url.test.ts`)
  - `src/db/posts.ts` (`findPostByUrl`, `findPostCollectionIds`, `savePost`) et
    `src/db/collections.ts` (`createCollection`)
  - `savePost` diffuse les rangements `post_collections` (insertion, résurrection d'une ligne
    supprimée, ou `deleted_at`) dans une seule transaction — jamais de vrai `DELETE`
    (ARCHITECTURE.md §4)
  - Composants React Native Reusables ajoutés : `checkbox`, `label`, `icon`. La note et le
    champ « nouvelle collection » utilisent `BottomSheetTextInput` (clavier intégré à la
    feuille) plutôt que `Input`/`Textarea` — `className` NativeWind ne s'applique pas
    automatiquement aux composants tiers non enregistrés via `cssInterop`, stylés en `style`
    inline avec les couleurs du thème à la place
- **`node --test`** (natif Node 24, zéro dépendance) comme suite de tests — `npm test`. Premier
  module couvert : l'analyse d'URL
- **ESLint configuré** (`eslint.config.js`, `eslint-config-expo`) — `npm run lint` (`expo lint`)
  échoue avec une erreur de résolution de module ; `npx eslint .` fonctionne en attendant
- Initialisation du projet sur **Expo SDK 57** (React Native 0.86.2, React 19.2.3, TypeScript),
  `expo-doctor` 21/21
- **NativeWind 4.2.6 + Tailwind CSS 3.4.19** — versions épinglées volontairement
- **React Native Reusables** configuré (helper `cn()`, variables CSS de thème, `PortalHost`,
  `inlineRem: 16`), premiers composants `Button` et `Text`
- **Réception du partage Android** via `expo-share-intent` 8.0.1, testée de bout en bout sur
  appareil réel — filtre d'intention `text/*`
  - Deux chemins distincts implémentés : `+native-intent.tsx` (app fermée) et
    `ShareIntentProvider` racine (app déjà ouverte en arrière-plan)
- **Structure de routing** `(tabs)` + `Stack` racine, permettant de présenter l'écran de
  partage en modale par-dessus les onglets
- **Squelette Drizzle** : `drizzle.config.ts`, `src/db/schema.ts` (vide), dossier de migrations
- **Schéma de données V1** : tables `posts`, `collections` et `post_collections` (un post
  peut appartenir à plusieurs collections), avec les 5 colonnes de synchronisation sur
  chacune ; première migration générée
  - Décisions de modèle consignées dans [ARCHITECTURE.md](./ARCHITECTURE.md) §4
- **Accès à la base** (`src/db/index.ts`) : ouverture avec `enableChangeListener: true`
  (requis par `useLiveQuery`) et `newId()` pour les UUID générés côté client
- **Migrations appliquées au démarrage** (`useMigrations`), avec calque d'attente et calque
  d'erreur ; le routage d'un partage attend que la base soit prête
- **Phase 1 validée sur appareil réel** (24 août 2026) : les deux chemins de réception du
  partage fonctionnent (app fermée, app en arrière-plan), l'écriture en base se reflète sans
  rechargement, et persiste après redémarrage complet de l'app
- **Chaîne de build EAS** (`eas.json`) : profils `development`, `preview`, `production`
- Documentation du projet : `README`, `ARCHITECTURE`, `DEVELOPMENT`, `CONTRIBUTING`,
  `ROADMAP`, `TODO`, `CHANGELOG`

- **`expo-clipboard`** installé en prévision du « copier le lien » de la phase 3 — ajouté
  avant le premier rebuild natif pour ne pas consommer un second crédit EAS plus tard

### Corrigé

- **Trois bugs de réactivité `useLiveQuery`** (`drizzle-orm/expo-sqlite`, `src/db/posts.ts`) :
  la fonction n'écoute que la table du `.from()` racine d'une requête, jamais les tables
  jointes (`node_modules/drizzle-orm/expo-sqlite/query.js`). `savePost`,
  `removePostFromCollection` et `softDeletePost` ne touchaient qu'une table jointe sans toucher
  la table racine des requêtes affectées (listes de posts `.from(posts)`, compteur de posts par
  collection `.from(collections)`) — corrigé en leur faisant aussi toucher `updated_at` sur la
  table racine manquante
- **Grille Collections à 2 colonnes avec espace vide** au lieu de 3 : Yoga arrondit chaque
  tuile indépendamment au pixel natif, la somme de 3 tuiles arrondies vers le haut pouvait
  dépasser la largeur disponible de moins d'1px et faire passer la 3ᵉ à la ligne suivante
  (`flex-wrap` + taille calculée non entière). Corrigé en passant la grille à `FlashList
  numColumns={3}` (`src/screens/collections/tile-size.ts`), qui décide seul du nombre de
  colonnes indépendamment de la taille des tuiles — élimine la classe de bug plutôt que de
  la contourner ; testé (`tile-size.test.ts`)
- **`npm test` n'exécutait pas les fichiers de test à plus d'un niveau sous `src/`** :
  `"node --test src/**/*.test.ts"` dépend de l'expansion du glob par le shell, qui ne
  descend qu'un niveau sans `globstar` bash (off par défaut) — `tile-size.test.ts` n'était
  jamais lancé, silencieusement. Remplacé par `"node --test"` seul (découverte récursive
  native de Node, indépendante du shell)
- `useColorScheme()` pouvait renvoyer `null` ou `'unspecified'` : le `?? 'light'` du layout
  racine ne retombait pas sur un thème valide dans ces cas

### Modifié

- **Versions de patch alignées sur le SDK 57** (`npx expo install --fix`) : `expo` ~57.0.16,
  `@expo/ui`, `expo-constants`, `expo-dev-client`, `expo-notifications`, `expo-router`,
  `expo-splash-screen`. Fait **avant** le premier rebuild natif, pour que le dev client
  contienne ce code natif-là et pas la version précédente. `expo-doctor` : 21/21
- **Driver SQLite : `@op-engineering/op-sqlite` → `expo-sqlite`**
  - `drizzle-orm/op-sqlite` ne fournit pas `useLiveQuery` — demande de fonctionnalité ouverte
    chez Drizzle depuis le 8 septembre 2024, toujours non implémentée
    ([drizzle-orm#2926](https://github.com/drizzle-team/drizzle-orm/issues/2926))
  - La justification initiale du choix d'op-sqlite (compatibilité PowerSync en V1.5) était
    fausse : PowerSync instancie sa propre base et ne réutilise pas la connexion de l'app.
    Le schéma Drizzle est ce qui survit à la transition, pas le driver
  - Ajout de `babel-plugin-inline-import`, requis par Drizzle pour les migrations `.sql` avec
    ce driver
  - Détail complet : [ARCHITECTURE.md](./ARCHITECTURE.md) §3
- Versions verrouillées (suppression des `^`/`~`) pour `expo`, `nativewind`, `tailwindcss`,
  `expo-share-intent`, `react-native-reanimated`, `react-native-gesture-handler`

### Corrigé

- **Partage non détecté quand l'app tournait déjà** en arrière-plan. `+native-intent.tsx` ne
  couvre que le démarrage à froid ; Android réutilise l'activité existante
  (`launchMode: singleTask`) sans repasser par ce fichier. Corrigé en montant
  `ShareIntentProvider` à la racine
- **Texte invisible en mode sombre** sur l'écran de partage : le composant `Text` de
  `react-native` n'applique aucune couleur par défaut. Remplacé par celui de React Native
  Reusables, qui applique `text-foreground`
- Dépendance manquante `react-native-svg`, requise par `lucide-react-native` et signalée
  par `expo-doctor`
- Fichier temporaire du harness Claude Code retiré du suivi git, `.gitignore` complété

### Notes de compatibilité

- **`@gorhom/bottom-sheet` v5 × Reanimated v4** : la documentation officielle de
  bottom-sheet ne mentionne que Reanimated v3, alors que le SDK 57 fournit la v4. Aucune
  confirmation officielle n'existe. **Testé sur appareil réel : fonctionne.** À re-vérifier
  si l'une des deux versions change
- **Expo Go est définitivement inutilisable** sur ce projet à cause d'`expo-share-intent`
  (module natif hors du périmètre d'Expo Go). Un *development build* est obligatoire
