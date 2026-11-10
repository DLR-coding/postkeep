# Refonte de l'interface — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Donner à PostKeep l'interface validée en maquettes : dossiers en verre dépoli, liste « Fiche » en 9:16, barre flottante avec recherche, feuille de détail restylée, clair et sombre.

**Architecture:** La logique testable (filtre, recherche, surlignage, aperçus de dossiers) vit dans des modules purs sous `src/lib/`, testés avec `node --test`. Les composants visuels partagés (autocollant, vignette, barre) vont dans `src/components/`. `NativeTabs` est remplacé par les onglets JS d'`expo-router` avec une `tabBar` personnalisée. L'état de la barre (texte de recherche) est un petit store Zustand d'interface.

**Tech Stack:** Expo SDK 57, expo-router (onglets JS vendorisés, prop `tabBar`), NativeWind 4.2.6, React Native Reusables, FlashList 2, expo-image, expo-blur (à installer), @gorhom/bottom-sheet v5, Zustand, Drizzle + expo-sqlite.

**Spec:** `docs/superpowers/specs/2026-11-10-refonte-ui-design.md` — à lire en entier avant toute tâche. Maquettes validées : 1er tour https://claude.ai/code/artifact/c9ac6e88-b141-4c73-b198-5324d2d4517c (piste A), 2e tour https://claude.ai/code/artifact/afd0d2ec-9f77-4e5b-809d-4c88de1e74ab (variante 5), 3e tour https://claude.ai/code/artifact/684afd53-89cd-4efe-af49-1fc99a9d0715 (décisions 1 à 6).

## Global Constraints

- NativeWind **4.2.6** et Tailwind **3.4.19** épinglés ; ne jamais suivre la doc Expo qui recommande NativeWind v5.
- `npx expo install <paquet>` pour tout ajout (jamais `npm install <paquet>` seul) ; jamais `npm audit fix --force` ; jamais `react-native-reusables init`.
- Vérifier la doc d'une bibliothèque (Context7 ou https://docs.expo.dev/versions/v57.0.0/) avant de l'utiliser ; module natif incompatible → s'arrêter et signaler.
- Données persistantes en SQLite uniquement ; Zustand ou état local seulement pour l'interface. Jamais de vrai `DELETE`.
- Aucune couleur en dur dans les composants : tout passe par les jetons (`global.css` + `tailwind.config.js` pour `className`, `THEME` de `src/lib/theme.ts` pour les props de style). Seules exceptions : les couleurs de marque des plateformes, centralisées dans `src/lib/share-url.ts`.
- Textes d'interface en anglais (l'app a été traduite, commit c92e0eb) ; commentaires et docs en français, comme le reste du dépôt.
- Tests purs : `node --experimental-strip-types --no-warnings --test <fichiers>` (Node 22.13, `npm test` ne voit pas les `.ts`). Les modules testés importent leurs voisins avec l'extension `.ts` (`allowImportingTsExtensions` est actif).
- Vérification de fin de chaque tâche visuelle : sur appareil, en clair **et** en sombre (`npx expo start --dev-client --tunnel`, WSL en réseau mirrored).
- Fin de branche : `npx expo-doctor` 21/21, `npx @react-native-reusables/cli doctor --yes` « All checks passed », `npx tsc --noEmit` sans nouvelle erreur, `npx eslint .` sans nouvelle erreur (une erreur préexistante dans `src/hooks/use-color-scheme.web.ts`).

## Review Focus

- Recherche avec des caractères spéciaux de regex (`c++`, `(`, `?`) → aucun plantage, surlignage correct. Test dans la tâche 2.
- Recherche sans accent qui doit trouver un texte accentué (`lea` → « Léa ») et inversement, surlignage aligné sur le texte d'origine. Test dans la tâche 2.
- Post sans URL (partage de texte brut) ou d'une plateforme inconnue (YouTube) → visible avec le filtre « All », absent des filtres de plateforme, vignette de secours neutre sans autocollant. Tests dans les tâches 2 et 3.
- Collection sans aucun post, ou dont aucun post n'a de miniature → dossier avec feuilles « texte », pas d'autocollant, compte 0. Test dans la tâche 3.
- Dernière ligne de liste et bouton « Open » jamais cachés par la barre flottante ni par le clavier. Vérification appareil dans les tâches 4, 6 et 9.

---

### Task 1: Jetons de thème, expo-blur et build

**Files:**
- Modify: `global.css` (`:root` et `.dark:root`), `tailwind.config.js` (`theme.extend.colors`), `src/lib/theme.ts` (`THEME.light` / `THEME.dark`), `package.json` / `package-lock.json` (via `npx expo install`)

**Interfaces:**
- Produces : classes Tailwind et clés `THEME` suivantes, utilisées par toutes les tâches suivantes :
  `glass` / `glass-border` (barre), `folder-back`, `folder-sheet`, `folder-sheet-line`, `folder-front`, `folder-front-border` (dossiers), `note` / `note-foreground` (encart Note), `chip` / `chip-foreground` (puces), `pill` (filtres inactifs). Dans `THEME` : `glass`, `glassBorder`, `folderBack`, `folderSheet`, `folderSheetLine`, `folderFront`, `folderFrontBorder`, `note`, `noteForeground`, `chip`, `chipForeground`, `pill`.
- Valeurs de départ (maquette du 3e tour, ajustables à l'œil sur appareil) — clair : glass `rgba(238,238,242,.82)`, folder-back `#e5e6ea`, folder-sheet `#ffffff`, folder-sheet-line `#e1e3e8`, folder-front `rgba(243,243,246,.72)`, note `#f1f1f4`, chip `#e6e7eb`, pill `#efeff2` ; sombre : glass `rgba(34,36,44,.82)`, folder-back `#22242b`, folder-sheet `#2b2e37`, folder-sheet-line `#3c404b`, folder-front `rgba(46,49,60,.72)`, note `#1d1f26`, chip `#2a2d35`, pill `#1f2128`. Les couleurs avec alpha s'écrivent en entier dans `global.css` (pas au format `H S% L%` des autres jetons) et sont déclarées sans `<alpha-value>` dans `tailwind.config.js`.

- [ ] **Step 1:** Lire la doc `expo-blur` v57 (https://docs.expo.dev/versions/v57.0.0/sdk/blur-view/) et confirmer : `BlurTargetView`, prop `blurTarget`, `blurMethod="dimezisBlurViewSdk31Plus"`, rendu après la liste.
- [ ] **Step 2:** `npx expo install expo-blur` puis `npx expo-doctor` → 21/21.
- [ ] **Step 3:** Ajouter les jetons ci-dessus dans les trois fichiers.
- [ ] **Step 4:** `npx tsc --noEmit` (seule l'erreur `global.css` préexistante) et lancer l'app : rien ne change visuellement.
- [ ] **Step 5:** Commit `feat: add redesign theme tokens and expo-blur`.
- [ ] **Step 6:** Lancer le build de développement (EAS builde depuis `git HEAD`, d'où le commit avant) : `eas build --profile development --platform android --non-interactive`, en arrière-plan. Il embarque `expo-blur` et `react-native-webview`. Les tâches 2 à 3 n'en ont pas besoin ; la tâche 4 si.

### Task 2: Filtre, recherche et surlignage (logique pure)

**Files:**
- Create: `src/lib/post-filters.ts`, `src/lib/post-filters.test.ts`

**Interfaces:**
- Consumes : `detectPlatform(url: string): Platform | null` de `./share-url.ts`.
- Produces :
  - `type PlatformFilter = 'all' | 'instagram' | 'tiktok' | 'x'`
  - `type SearchablePost = { url: string | null; caption: string | null; note: string | null }`
  - `filterPosts<T extends SearchablePost>(posts: T[], opts: { platform: PlatformFilter; query: string }): T[]` — plateforme d'abord, puis recherche dans `caption`, `note` et `url` ; requête vide ou blanche = pas de filtre texte.
  - `matchesText(text: string, query: string): boolean` — insensible à la casse et aux accents.
  - `splitHighlight(text: string, query: string): { text: string; match: boolean }[]` — découpe le texte d'origine (accents conservés) en segments, toutes les occurrences marquées.
  - `filterCollectionsByName<T extends { name: string }>(items: T[], query: string): T[]`.

- [ ] **Step 1: Écrire les tests** (`post-filters.test.ts`), entre autres :
  - `filterPosts` avec `platform: 'tiktok'` ne garde que les URL `tiktok.com` ; un post `url: null` et un post `youtube.com` n'apparaissent qu'avec `'all'`.
  - `filterPosts` avec `query: 'ramen'` trouve un post par sa note (« …ramen place… ») et un autre par sa légende ; `query: '   '` ne filtre rien.
  - `matchesText('Ask Léa', 'lea') === true` et `matchesText('Ask Lea', 'léa') === true`.
  - `splitHighlight('Ask Léa about Léa', 'lea')` → `[{ 'Ask ', false }, { 'Léa', true }, { ' about ', false }, { 'Léa', true }]`.
  - `splitHighlight('c++ tips', 'c++')` → `[{ 'c++', true }, { ' tips', false }]` (pas d'exception) ; `splitHighlight('a (b)', '(')` marque la parenthèse.
  - `splitHighlight('Hello', '')` → `[{ 'Hello', false }]`.
  - `filterCollectionsByName` : `'japan'` garde « Japan trip ».
- [ ] **Step 2:** Lancer `node --experimental-strip-types --no-warnings --test src/lib/post-filters.test.ts` → échec (module absent).
- [ ] **Step 3:** Implémenter. Pas de `RegExp` construite depuis la requête : recherche par `indexOf` sur une version « pliée » du texte. Le pliage se fait **caractère par caractère** (`normalize('NFD')`, retrait des diacritiques `\p{M}`, `toLowerCase()`, en gardant un caractère de sortie par caractère d'entrée) pour que les indices restent alignés sur le texte d'origine.
- [ ] **Step 4:** Relancer le test → PASS ; relancer aussi `src/lib/share-url.test.ts` et `src/screens/collections/tile-size.test.ts` → PASS.
- [ ] **Step 5:** Commit `feat: add pure post filter, search and highlight helpers`.

### Task 3: Aperçus des dossiers (requête + logique pure)

**Files:**
- Create: `src/lib/collection-previews.ts`, `src/lib/collection-previews.test.ts`
- Modify: `src/db/collections.ts` (nouvelle requête)

**Interfaces:**
- Consumes : `detectPlatform` de `./share-url.ts`.
- Produces :
  - `const UNCATEGORIZED_KEY = 'none'` (même valeur que `UNCATEGORIZED_ID` de `src/screens/collections/index.tsx`, qui l'importera).
  - `type PreviewRow = { collectionId: string | null; postId: string; url: string | null; thumbnailUrl: string | null; updatedAt: Date }`
  - `type CollectionPreview = { thumbnails: string[]; platform: Platform | null }`
  - `buildCollectionPreviews(rows: PreviewRow[]): Map<string, CollectionPreview>` — clé = `collectionId`, ou `UNCATEGORIZED_KEY` quand `collectionId` est `null` ; `thumbnails` = jusqu'à 3 `thumbnailUrl` non nulles, posts les plus récents d'abord, sans doublon ; `platform` = plateforme la plus fréquente parmi les posts de la collection (égalité → celle du post le plus récent), `null` si aucune.
  - `collectionPreviewRowsQuery()` dans `src/db/collections.ts` : `.from(posts)` (table racine `posts`, pour que `useLiveQuery` réagisse aux changements de miniature — cf. la limite documentée dans `src/db/posts.ts`), `leftJoin` sur `postCollections` actifs et `collections` actives, `where posts.deletedAt IS NULL`, tri `posts.updatedAt` décroissant, colonnes de `PreviewRow`. Un post rangé dans une collection supprimée compte comme « Uncategorized » seulement s'il n'a plus aucune collection active (même règle que `uncategorizedPostsCountQuery`).

- [ ] **Step 1: Écrire les tests** : 4 posts dans « Recipes » dont 3 TikTok et 1 Instagram → `platform: 'tiktok'`, `thumbnails` = les 3 plus récentes non nulles ; collection dont aucun post n'a de miniature → `thumbnails: []` ; post `collectionId: null` → sous `'none'` ; post sans URL → ne compte pas pour la plateforme ; égalité 1 TikTok / 1 Instagram → plateforme du plus récent ; une collection absente des lignes n'a pas d'entrée (l'écran affichera alors un dossier vide).
- [ ] **Step 2:** Lancer le test → échec.
- [ ] **Step 3:** Implémenter `buildCollectionPreviews` puis la requête (non testable hors appareil).
- [ ] **Step 4:** Test → PASS.
- [ ] **Step 5:** Commit `feat: compute folder previews for collections`.

### Task 4: Barre de navigation flottante (remplace NativeTabs)

**Files:**
- Create: `src/stores/nav-search-store.ts`, `src/components/glass-tab-bar.tsx`
- Modify: `src/app/(tabs)/_layout.tsx`
- Delete: `src/components/app-tabs.tsx`, `assets/images/tabIcons/home.png`, `assets/images/tabIcons/collections.png` (plus utilisés)

**Interfaces:**
- Produces :
  - `useNavSearchStore` : `{ query: string; setQuery: (q: string) => void; clear: () => void }`.
  - `TAB_BAR_CLEARANCE: number` exporté par `glass-tab-bar.tsx` = hauteur de la barre + sa marge basse (52 + 24 dans la maquette) ; les écrans l'ajoutent, avec `insets.bottom`, au `paddingBottom` de leur liste.
  - `GlassTabBar(props: BottomTabBarProps)` : la `tabBar` des onglets JS.
- Comportement (spec, objectif 4) : champ « Search notes and links » sur l'onglet `index`, « Search collections » sur `collections` ; croix pour vider ; deux ronds (icônes `List` et `Folder` de `lucide-react-native`), le rond actif en `primary` / `primary-foreground` ; `accessibilityLabel` « Posts » et « Collections » sur les ronds, « Clear search » sur la croix. Changer d'onglet appelle `clear()`. La barre flotte (position absolue, marges 14 px, 24 px + `insets.bottom` du bas) et se cale au-dessus du clavier.

- [ ] **Step 1:** Vérifier dans la doc / Context7 : (a) `Tabs` d'`expo-router` + `tabBar` + `tabBarStyle: { position: 'absolute' }` pour que le contenu passe sous la barre ; (b) où placer `BlurTargetView` pour qu'un `BlurView` de la barre floute l'écran actif sans se flouter lui-même. Si (b) n'est pas réalisable proprement, garder `blurMethod` à `'none'` (voile `glass` translucide) et le noter dans le commit — la spec l'accepte comme repli.
- [ ] **Step 2:** Écrire le store, la barre et le nouveau `_layout.tsx` (onglets `index` et `collections`, en-tête masqué).
- [ ] **Step 3:** Clavier : la barre doit rester visible juste au-dessus du clavier quand le champ a le focus. Vérifier le comportement actuel sur Android (pas de `softwareKeyboardLayoutMode` dans `app.json`) avant de choisir entre le décalage par le système et un décalage animé (`useAnimatedKeyboard` de Reanimated). Ne pas changer `softwareKeyboardLayoutMode` : les feuilles du bas ont un comportement clavier validé qui en dépend.
- [ ] **Step 4:** Sur appareil (build de la tâche 1) : les deux onglets, le changement d'onglet vide le champ, la barre au-dessus du clavier, le flou visible derrière la barre en clair et en sombre, pas de barre sur `/collection/[id]` ni sur l'écran de partage. Le texte tapé n'a encore aucun effet (branché aux tâches 6 et 7).
- [ ] **Step 5:** Commit `feat: replace native tabs with a floating glass tab bar`.

### Task 5: Autocollant et vignette 9:16 partagés

**Files:**
- Create: `src/components/platform-sticker.tsx`, `src/components/post-thumb.tsx`
- Modify: `src/lib/share-url.ts` (`PLATFORM_META` : ajouter les couleurs de la vignette de secours)

**Interfaces:**
- Consumes : `PLATFORM_META`, `detectPlatform`, `type Platform` de `src/lib/share-url.ts`.
- Produces :
  - `PlatformSticker({ platform, size }: { platform: Platform; size: 'sm' | 'md' })` — `sm` 24 px (bordure 2), `md` 38 px (bordure 3) ; carré arrondi, rotation −6° à −7°, ombre. Instagram en dégradé (`react-native-svg`, déjà installé — pas de nouveau module natif), TikTok noir avec ombres de texte cyan `#25f4ee` / rose `#fe2c55`, X et Threads noirs. Bordure blanche en clair ; en sombre, blanche aussi (les autocollants noirs se détachent grâce à elle).
  - `PostThumb({ post, width, highlightQuery }: { post: { url: string | null; caption: string | null; note: string | null; thumbnailUrl: string | null }; width: number; highlightQuery?: string })` — boîte 9:16 de largeur `width`, rayon `width * 0.15`. Trois rendus : (1) vidéo verticale avec miniature → `Image` en `cover` + petit triangle « lecture » ; (2) miniature d'un autre format → la même image en fond avec `blurRadius` puis l'image en `contain` centrée ; (3) pas de miniature → vignette 6A : fond de plateforme (dégradé Instagram ; noir avec halos cyan/rose pour TikTok ; `#16171b` pour X et Threads ; jeton `muted` pour un lien inconnu ou sans URL), extrait de `caption ?? note` en blanc, 7 lignes max, surligné si `highlightQuery`. Autocollant `sm` en bas à gauche sauf plateforme inconnue.
  - `isVerticalVideo(url: string | null, platform: Platform | null): boolean` déplacé de `post-card.tsx` vers `src/lib/share-url.ts` (même règle : TikTok, ou Instagram avec `/reel/`), avec un test ajouté dans `src/lib/share-url.test.ts`.

- [ ] **Step 1:** Ajouter le test de `isVerticalVideo` (TikTok → vrai ; `instagram.com/reel/x` → vrai ; `instagram.com/p/x` → faux ; `null` → faux), le lancer → échec, déplacer la fonction, relancer → PASS.
- [ ] **Step 2:** Écrire `PlatformSticker` et `PostThumb`.
- [ ] **Step 3:** Vérification appareil indirecte : faite dans la tâche 6, qui est la première à les afficher.
- [ ] **Step 4:** Commit `feat: add platform sticker and 9:16 post thumbnail`.

### Task 6: Liste « Fiche » et écran All posts

**Files:**
- Modify: `src/components/post-card.tsx` (réécriture du rendu, mêmes props), `src/app/(tabs)/index.tsx`
- Create: `src/components/platform-filter-pills.tsx`

**Interfaces:**
- Consumes : `filterPosts`, `splitHighlight`, `type PlatformFilter` (tâche 2) ; `useNavSearchStore`, `TAB_BAR_CLEARANCE` (tâche 4) ; `PostThumb`, `PlatformSticker` (tâche 5).
- Produces :
  - `PostCard({ item, collectionId, highlightQuery }: { item: PostListItem; collectionId?: string; highlightQuery?: string })` — ligne de la spec (objectif 2) : `PostThumb` 80 px, « Plateforme · date » (`Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' })`, l'app est en anglais), légende 3 lignes max, encart « Note » (jetons `note` / `note-foreground`), puces de collection (« No collection » si aucune), séparateur fin (jeton `border`), pas de carte. Le balayage Supprimer / Retirer et ses `Alert.alert` restent tels quels.
  - `PlatformFilterPills({ value, onChange }: { value: PlatformFilter; onChange: (v: PlatformFilter) => void })` — libellés « All », « Instagram », « TikTok », « X » ; actif en `primary`.
- Écran (objectifs 2, 3, 5) : titre « All posts » seul ; pilules ; ligne « N TikTok posts » si un filtre est actif, « N results for “terme” » si une recherche est en cours (les deux combinés : « N results for “terme” in TikTok ») ; `FlashList` avec `paddingBottom: TAB_BAR_CLEARANCE + insets.bottom` ; ancienne barre de recherche supprimée. État vide existant conservé ; filtre ou recherche sans résultat → « No matching post. » (existant).

- [ ] **Step 1:** Réécrire `PostCard`, créer les pilules, brancher l'écran sur le store et `filterPosts`.
- [ ] **Step 2:** `npx tsc --noEmit` et `npx eslint src/components src/app` sans nouvelle erreur (les 2 avertissements « unused » actuels de `post-card.tsx` disparaissent avec la réécriture).
- [ ] **Step 3:** Sur appareil, clair et sombre : vidéo verticale, photo non 9:16 (fond flouté), post X sans miniature (vignette 6A), note Threads, texte brut sans URL ; filtres ; recherche « ramen » surlignée dans la légende, la note et la vignette de secours ; défilement fluide sur toute la liste (flou statique) ; dernière ligne visible au-dessus de la barre ; balayage Supprimer intact. Écran d'une collection (`/collection/[id]`) : mêmes lignes, bouton Retirer présent.
- [ ] **Step 4:** Commit `feat: redesign the All posts list as 9:16 rows with filters`.

### Task 7: Écran Collections en dossiers

**Files:**
- Create: `src/screens/collections/folder.tsx`
- Modify: `src/screens/collections/index.tsx`, `src/screens/collections/tile-size.ts`, `src/screens/collections/tile-size.test.ts`

**Interfaces:**
- Consumes : `collectionPreviewRowsQuery` + `buildCollectionPreviews` + `UNCATEGORIZED_KEY` (tâche 3) ; `filterCollectionsByName` (tâche 2) ; `useNavSearchStore`, `TAB_BAR_CLEARANCE` (tâche 4) ; `PlatformSticker` (tâche 5).
- Produces : `CollectionFolder({ name, count, preview, virtual, size, onPress, onLongPress }: { name: string; count: number; preview: CollectionPreview | undefined; virtual?: boolean; size: number; onPress: () => void; onLongPress?: () => void })` — dessin de la spec (objectif 1) : dos `folder-back` avec onglet, jusqu'à 3 feuilles `folder-sheet` inclinées (−8°, 2°, 10°) montrant une miniature en haut ou deux traits `folder-sheet-line`, façade `folder-front` translucide **sans** `BlurView`, autocollant `md` en bas à droite si `preview.platform` ; sous le dossier le nom et le compte en pastille (`chip`). `virtual` → façade en pointillés, pas d'autocollant.
- `tile-size.ts` : `NUM_COLUMNS = 2`.

- [ ] **Step 1:** Mettre à jour `tile-size.test.ts` pour 2 colonnes (les assertions dérivent de `NUM_COLUMNS`, vérifier qu'aucune valeur n'est codée pour 3), le lancer → échec si une valeur l'était, passer `NUM_COLUMNS` à 2, relancer → PASS.
- [ ] **Step 2:** Écrire `CollectionFolder`.
- [ ] **Step 3:** Écran : titre « Collections », sous-titre « N collections · M posts » (M = posts actifs distincts, pas la somme des comptes : un post peut être dans plusieurs collections — reprendre le compte de `activePostsQuery` groupé), bouton « + » rond en haut à droite (`primary`, `accessibilityLabel` « New collection ») qui ouvre `CreateCollectionSheet` existante ; suppression du bouton flottant et de l'ancienne barre de recherche ; filtre par nom depuis le store ; appui long → `CollectionActionsSheet` existante inchangée ; `paddingBottom` avec `TAB_BAR_CLEARANCE`.
- [ ] **Step 4:** Sur appareil, clair et sombre : dossiers avec et sans miniatures, « Uncategorized » en pointillés, création via « + », renommer / supprimer par appui long, recherche par nom, rien sous la barre.
- [ ] **Step 5:** Commit `feat: redesign collections as frosted folders`.

### Task 8: Feuille de détail, aperçu

**Files:**
- Modify: `src/components/post-detail-sheet.tsx` (aperçu et pied hors édition uniquement)

**Interfaces:**
- Consumes : `PostThumb`, `PlatformSticker` (tâche 5).
- Rendu (objectif 7) : `PostThumb` de 92 px à gauche ; à droite le libellé de plateforme, l'URL tronquée sur une ligne (sélectionnable), les puces de collection, « Saved <date> » ; puis « Caption » si présente, « Note » (encart `note`) si présente ; indice « Pull up to edit » ; pied « Open in <plateforme> » à la couleur de la plateforme (dégradé pour Instagram). L'actuel `PlatformHeader` est remplacé. Mécanique inchangée (snap points, retour Android, garde anti-flash `frozenPost`).

- [ ] **Step 1:** Restyler l'aperçu.
- [ ] **Step 2:** Sur appareil, clair et sombre : post avec miniature, sans miniature, sans URL (pas de bouton Open, comme aujourd'hui) ; tirer vers le haut passe toujours en édition ; le bouton Open ouvre l'app d'origine.
- [ ] **Step 3:** Commit `feat: restyle the post detail preview`.

### Task 9: Feuille de détail, édition et bug de hauteur de la Note

**Files:**
- Modify: `src/components/post-fields-form.tsx`, `src/components/post-detail-sheet.tsx`

**Interfaces:**
- Consumes : `PostThumb` (tâche 5).
- Rendu (objectif 7) : en-tête compact (`PostThumb` 34 px + plateforme + date) ; **Collections en haut** : en variante `chips`, `CollectionChips` affiche **toutes** les collections en puces à bascule (cochée = `primary` avec ✓, non cochée = `chip`), sur deux lignes max avec défilement, puis la puce « + New » en pointillés qui ouvre `CollectionPickerSheet` existante ; puis la **Note qui prend tout le reste** et défile seule ; pied Open (contour couleur plateforme), Save, corbeille (`accessibilityLabel` « Delete »). La variante `picker` (écran de partage) ne change pas.

- [ ] **Step 1: Reproduire le bug** (sur appareil, avant tout changement) : un post avec une note plus longue que l'espace disponible, passer en édition. Attendu aujourd'hui : bandeau de debug `outer=728 … noteWrapper=524 content=524`, le cadre de la note descend sous le pied, un glissé sélectionne du texte au lieu de faire défiler.
- [ ] **Step 2: Confirmer la cause** avant de corriger (superpowers:systematic-debugging) : vérifier que la hauteur disponible n'est pas réduite de la hauteur du pied — `paddingBottom: footerHeight` sur le `BottomSheetView` de `post-detail-sheet.tsx` — par exemple en journalisant `footerHeight` au moment de la mesure de `outer`. Une seule hypothèse à la fois.
- [ ] **Step 3:** Corriger à la source, puis retirer toute l'instrumentation (`debug`, `debugOverlay`, `debugText`, `console.log('[note-debug]')`).
- [ ] **Step 4:** Réagencer l'édition et réécrire `CollectionChips` comme décrit.
- [ ] **Step 5:** Sur appareil, clair et sombre : note longue → dernière ligne visible juste au-dessus du pied, glissé = défilement de la note ; clavier ouvert dans la note → le texte suivi reste visible (comportement `BottomSheetTextInput` + `keyboardBehavior="fillParent"` inchangé) ; cocher / décocher des collections puis Save → enregistré ; « + New » ouvre la feuille empilée, créer une collection l'ajoute et la coche ; retour Android re-snap à l'aperçu ; écran de partage (variante `picker`) identique à avant.
- [ ] **Step 6:** Commit `fix: let the note scroll in full-screen edit and restyle edit mode`.

### Task 10: Documentation et vérifications de fin

**Files:**
- Modify: `ARCHITECTURE.md` (§7 Navigation : arborescence réelle, onglets JS + `GlassTabBar` à la place de `NativeTabs` ; §8 : `expo-blur` et `react-native-webview` dans le tableau des dépendances natives), `TODO.md` (section refonte cochée ; dans la phase 7, cocher « réagencer l'écran d'édition »), `CHANGELOG.md` (entrée refonte), `DEVELOPMENT.md` §3 (`--tunnel` comme commande par défaut sous WSL mirrored, avec la raison : pare-feu Hyper-V sur le port 8081)

- [ ] **Step 1:** Mettre la doc à jour.
- [ ] **Step 2:** `npx expo-doctor` → 21/21 ; `npx @react-native-reusables/cli doctor --yes` → « All checks passed » ; `npx tsc --noEmit` et `npx eslint .` sans nouvelle erreur ; tous les tests purs : `node --experimental-strip-types --no-warnings --test src/lib/*.test.ts src/screens/collections/tile-size.test.ts` → 0 échec.
- [ ] **Step 3:** Passe complète sur appareil, clair puis sombre : partage d'un Reel (écran de partage inchangé), liste, filtres, recherche, collections, détail, édition, suppression.
- [ ] **Step 4:** Commit `docs: document the redesign`.
