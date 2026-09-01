# TODO — PostKeep

> Tâches concrètes, prêtes à être prises. Pour la vision d'ensemble : [ROADMAP.md](./ROADMAP.md).
>
> **Convention** : cocher une case au moment où la tâche est terminée **et vérifiée**,
> dans le même commit que le travail. Une tâche découverte en cours de route s'ajoute ici
> plutôt que de rester dans une tête.

Dernière mise à jour : 30 août 2026

---

## 🔴 Bloquant — Phase 3 (consultation)

Objectif : retrouver et rouvrir ce qu'on a sauvegardé. Sans ça, la phase 2 ne sert à rien. Voir
[ROADMAP.md](./ROADMAP.md#phase-3--consultation) pour le détail et les points d'attention.

- [ ] **Liste des posts** avec `@shopify/flash-list` (**pas** `FlatList` — les listes seront
      longues)
- [ ] **Carte de post** : plateforme (déduite de l'URL, cf. `src/lib/share-url.ts`), note,
      collection(s), date
- [ ] **Ouverture** : appui sur la carte → `Linking.openURL()` → l'OS ouvre l'app d'origine
      (pas de WebView, cf. [ARCHITECTURE.md](./ARCHITECTURE.md) §6)
- [ ] **Suppression logique** (`deleted_at`, cf. [ARCHITECTURE.md](./ARCHITECTURE.md) §4
      « Deux niveaux de suppression ») : le balayage supprime le post dans « Tous les posts »,
      mais l'ôte seulement de la collection courante dans une vue collection — libellés
      distincts obligatoires (« Supprimer » vs « Retirer de … »), suppression définitive
      depuis une vue collection réservée à un chemin explicite
- [ ] **État vide** soigné — c'est le premier écran que verra un nouvel utilisateur
- [ ] **Valider sur appareil** : voir tous ses posts, en rouvrir un dans son app d'origine, en
      supprimer un et qu'il ne revienne pas après redémarrage (critère de fin de phase)

### Finitions issues du brainstorm UI/UX (30 août 2026)

- [x] **Troncature des badges de collection sur `PostCard`** : afficher les 3 premiers noms de
      collection, badge `+N` (ou `…`) si le post en a plus — validé sur appareil
- [x] **Fusionner la sheet de détail (`PostDetailSheet`) et l'écran d'édition** en un seul
      composant plein écran morphant, à la place de la route séparée `post/[id]/edit` — pattern
      « Now Playing » (Spotify/Apple Podcasts/Gmail compose) : un seul geste continu, pas de
      navigation — validé sur appareil (30 août 2026), y compris clavier sur le textarea Note et
      sur la recherche du picker de collections en plein écran (risque initial levé)
  - [x] `backgroundComponent` custom : rayon des coins interpolé sur `animatedIndex` (24px au
        snapPoint 50 % → 0 au snapPoint plein écran) — validé sur appareil. Interpolation correcte
        mais **invisible** : `card` et `background` sont la même couleur dans `THEME` (light et
        dark), donc le coin arrondi se fond avec l'écran faute de contraste ou de backdrop —
        cosmétique, pas un bug
  - [x] `handleComponent` custom : opacité de la poignée de drag interpolée à 0 en approchant du
        plein écran — validé sur appareil
  - [x] `topInset={0}` au snapPoint plein écran, pour couvrir aussi la zone sous la status bar —
        validé sur appareil
  - [x] `enablePanDownToClose` désactivé une fois au snapPoint plein écran ; le drag reste libre
        dans les deux sens entre 50 % et 100 % — validé sur appareil
  - [x] Bouton retour (geste iOS / bouton hardware Android) au snapPoint plein écran → re-snap à
        50 % (aperçu), **pas** de fermeture directe ; bouton « X » → fermeture complète explicite
        dans les deux cas (50 % ou 100 %) — validé sur appareil
- [x] **Collections sous « Note » dans l'écran d'édition** : liste horizontale scrollable de chips
      retirables (icône ✕ par chip), **remplace** le sélecteur actuel (grille de pills + recherche
      + création) pour ce mode uniquement — le formulaire de première sauvegarde
      (`src/screens/save-post/form.tsx`) garde son UI actuelle inchangée. Une chip finale « + »
      ouvre le picker complet (recherche + création) dans une feuille empilée
      (`CollectionPickerSheet`, second `BottomSheetModal`). `PostFieldsForm` a gagné un prop
      `variant: 'picker' | 'chips'` — validé sur appareil

### Bugs de réactivité `useLiveQuery` — corrigés le 31 août 2026

`drizzle-orm/expo-sqlite`'s `useLiveQuery` n'écoute que la table du `.from()` racine
d'une requête (`node_modules/drizzle-orm/expo-sqlite/query.js`), jamais les tables
jointes. Trois écritures qui ne touchaient qu'une table jointe sans toucher la table
racine des requêtes concernées ont été corrigées en les faisant aussi toucher
`updated_at` sur la table racine manquante :

- [x] `removePostFromCollection` (`src/db/posts.ts`) : ne touchait que `post_collections`
      → n'actualisait ni les listes de posts (`.from(posts)`) ni le compteur de posts par
      collection (`.from(collections)`). Touche maintenant aussi `posts.updated_at` et
      `collections.updated_at`
- [x] `savePost` (`src/db/posts.ts`) : le diff des rangements touchait `post_collections`
      sans toucher `collections` → compteur de posts par collection pas actualisé à
      l'ajout/retrait via le formulaire de sauvegarde. Touche maintenant
      `collections.updated_at` pour chaque collection dont le rangement a changé
- [x] `softDeletePost` (`src/db/posts.ts`) : ne touchait que `posts` → compteur de posts
      par collection pas actualisé à la suppression totale d'un post rangé dans une ou
      plusieurs collections. Touche maintenant `collections.updated_at` pour chacune de
      ses collections actives

### Améliorations UI repérées pendant les tests du 31 août 2026

- [ ] **Écran d'édition plein écran — réagencer** : collections en pastilles sur 2 lignes
      scrollables **en haut**, champ Note en dessous qui prend le reste de la page. C'est le champ
      Note qui doit scroller (pas la page), pour toujours voir le début du texte au lieu de
      seulement la fin quand la note est longue
- [ ] **`CollectionPickerSheet` (feuille empilée du picker de collections)** : remplacer le bouton
      pleine largeur « + Nouvelle collection » par une icône « + » seule, positionnée à droite de
      la barre de recherche
- [ ] **Dialog de confirmation de suppression d'un post (mode édition)** : remplacer l'`Alert.alert`
      natif par un dialog custom stylé comme le reste de l'app — même traitement que celui déjà
      fait sur les collections (`CollectionActionsSheet`, `src/screens/collections/index.tsx`)

---

## 🔴 Bloquant — Phase 4 (organisation)

Objectif : rester utilisable au-delà de quelques dizaines de posts. Voir
[ROADMAP.md](./ROADMAP.md#phase-4--organisation) pour le détail. Le schéma (`collections` +
`post_collections`, many-à-many) supporte déjà tout ce qui suit sans migration —
[ARCHITECTURE.md](./ARCHITECTURE.md) §4.

- [x] **Nouveau tab « Collections »** : remplace `(tabs)/explore.tsx` (boilerplate Expo par
      défaut, jamais retouché) plutôt que d'ajouter un 3ᵉ onglet. Grille de tuiles façon
      Fichiers/Finder — icône dossier + nom + badge nombre de posts — validé sur appareil
      (`src/screens/collections/`), grille à 3 colonnes exactes
- [x] **Pseudo-dossier « Sans collection »** dans la grille : filtre les posts dont
      `collectionNames.length === 0` (sinon invisibles depuis cet onglet) — virtuel, aucune ligne
      en base — validé sur appareil
- [x] **Navigation vers une collection** : `router.push('/collection/[id]')`, un vrai écran natif
      (pas une sheet — contrairement au détail d'un post, c'est une navigation « je descends d'un
      niveau »). Réutilise `PostCard` + `FlashList` comme `(tabs)/index.tsx`, filtré par
      `collectionId` — le détail d'un post y fonctionne sans code spécifique, via le store
      Zustand global `usePostDetailStore` déjà déclenché par `PostCard` — validé sur appareil
      (`src/screens/collection/`)
- [x] **Créer une collection** : bouton flottant « + » (redesign en cours de session, remplace la
      tuile « + » initialement prévue) → feuille de création (`createCollection`,
      `src/db/collections.ts`) — validé sur appareil (31 août 2026), y compris après correction
      d'un bug de clavier qui ne se fermait pas après création (`Keyboard.dismiss()` manquant
      avant `sheetRef.current?.dismiss()`)
- [x] **Renommer / supprimer une collection** : appui long → feuille d'actions custom (pas
      `Alert.alert`, pas de swipe comme sur `PostCard` — pas de sens de balayage naturel sur une
      grille de tuiles). Suppression = soft-delete (`deleted_at`) ; les jointures existantes
      (`activePostsQuery`, `src/db/posts.ts`) filtrent déjà `collections.deleted_at IS NULL`, donc
      rien à changer côté requêtes posts — validé sur appareil (31 août 2026). Confirmation de
      suppression en `Dialog` séparé (`@/components/ui/dialog`, ajouté via React Native Reusables)
      plutôt qu'un état de plus dans la feuille
- [ ] **Nouvelles requêtes** dans `src/db/collections.ts` : liste des collections actives + compte
      de posts par collection ; posts filtrés par `collectionId` (variante d'`activePostsQuery`)
      — codé, à valider sur appareil (module natif `expo-sqlite`, non exécutable hors runtime)

---

## 🟠 Important — à faire avant la fin de la V1

### Nettoyage du template de démonstration

Le projet contient encore le contenu d'exemple de `create-expo-app`. À supprimer au moment
où les vrais écrans les remplacent (phases 2-3), **pas avant** — ils servent encore de
terrain de test.

- [ ] Supprimer l'onglet `explore.tsx` et son contenu de démonstration
- [ ] Supprimer/remplacer `src/components/` : `animated-icon*`, `hint-row`, `web-badge`,
      `external-link`, `themed-text`, `themed-view`
- [ ] Reconfigurer `src/components/app-tabs.tsx` (onglets « Home »/« Explore » actuels)
- [ ] Nettoyer `assets/images/` : `react-logo*`, `expo-badge*`, `expo-logo`, `logo-glow`,
      `tutorial-web`, `tabIcons/`
- [x] Remplacer l'écran de test `src/app/shareintent.tsx` par le vrai écran de sauvegarde
- [x] Supprimer `DatabaseSmokeTest` de `src/app/(tabs)/index.tsx` (banc d'essai de la phase 1)
- [ ] Supprimer l'animation de démarrage Expo (`AnimatedSplashOverlay`)
  - 📝 C'est la cause du micro-saccade au lancement signalé en test : deux animations
    indépendantes de 600 ms qui s'enchaînent sans être synchronisées. Comportement du
    template, pas un bug du projet.

### Dette de configuration

- [ ] **Deux fichiers de thème** : `src/constants/theme.ts` (template) et `src/lib/theme.ts`
      (React Native Reusables) — deux sources de vérité pour les couleurs. Garder celui de
      RNR, migrer ce qui sert encore, supprimer l'autre
- [ ] **Deux `global.css`** : celui de la racine (NativeWind, actif) et `src/global.css`
      (template, 4 variables de police web). Vérifier si le second sert encore
- [ ] **Décider du sort de `DESIGN.md`** — c'est la charte du *site marketing* d'Expo, pas
      un système de design d'application mobile. Soit en extraire une palette pour PostKeep,
      soit le supprimer
- [ ] **Convention `src/screens/`** : la créer au premier écran qui dépasse ~80 lignes
      (cf. [CONTRIBUTING.md](./CONTRIBUTING.md) §3)

### Outillage

- [x] **Configurer ESLint** — `eslint.config.js` généré par `expo lint` (`eslint-config-expo`).
      ⚠️ `npm run lint` (`expo lint`) échoue avec « Cannot find module 'eslint' » — bug de
      résolution dans `@expo/cli`, contourner avec `npx eslint .` en attendant
- [ ] **Ajouter un dépôt distant** — le projet est en local uniquement (`git remote -v` est vide),
      donc aucune sauvegarde hors de cette machine
- [x] **Mettre en place des tests** — `node --test` (natif Node 24, zéro dépendance), `npm test`.
      Premier module couvert : l'analyse d'URL (`src/lib/share-url.ts`). Les fonctions
      d'accès base (`src/db/`) restent non testées automatiquement — module natif
      `expo-sqlite`, injouable hors runtime Expo

---

## 🟡 Avant distribution — Phase 6

- [ ] **`eas.json` : ajouter `"buildType": "apk"` au profil `production`**
  - Actuellement il produit un **AAB** (format Play Store), qui **n'est pas installable
    directement** depuis un lien ou une GitHub Release
- [ ] **Numéro de version** : `app.json` et `package.json` sont à `1.0.0`, valeur par défaut
      du template. Adopter un vrai schéma (`0.1.0` pour une pré-version ?)
- [ ] **Nom affiché** : `app.json` a `"name": "postkeep"` en minuscules — vérifier le rendu
      sous l'icône Android
- [ ] **Icône et écran de démarrage définitifs** — actuellement ceux d'Expo
      (`backgroundColor: "#208AEF"`, le bleu Expo)
- [ ] Rédiger les instructions d'installation (autoriser les sources inconnues sur Android)

---

## 🔵 Questions ouvertes — à trancher avant de coder la fonctionnalité concernée

Ce ne sont pas des tâches mais des décisions produit qui bloqueront le code le moment venu.

- [ ] **Rappels** : à quelle fréquence, et selon quel critère de pertinence ? (Phase 5)
  - Volontairement non tranché : la réponse dépend d'un usage réel qui n'existe pas encore.
    Rien à prévoir dans le schéma — la colonne `opened_at` s'ajoutera en phase 3, au moment
    où l'ouverture d'un post est codée
- [ ] **Contenu partagé qui n'est pas du texte** (capture d'écran, image) : la V1 ne déclare
      que `text/*` dans les filtres d'intention. Accepter `image/*` demanderait de copier le
      fichier et de gérer un stockage — hors V1 sauf décision contraire (Phase 2)

Les quatre autres questions ont été tranchées le 22 août 2026 et sont consignées dans
[ARCHITECTURE.md](./ARCHITECTURE.md) §4 (« Modèle V1 — décisions arrêtées ») : plusieurs
collections par post via `post_collections`, note en colonne, pas de table `tags` (une
collection multiple en tient lieu), plateforme déduite de l'URL, `url` nullable et normalisée,
post déjà présent rouvert plutôt que dupliqué.

---

## ✅ Terminé

<details>
<summary>Phase 2 — Capture (25 août 2026)</summary>

- [x] **Analyse de l'URL partagée** : détection de plateforme (Instagram, TikTok, X, Threads)
      et normalisation (query + fragment retirés) — `src/lib/share-url.ts`, testé
      (`src/lib/share-url.test.ts`, `npm test` via `node --test`, zéro dépendance ajoutée)
- [x] **Retrouver un post existant** par URL normalisée pour rouvrir en édition plutôt que
      dupliquer — `findPostByUrl` + `findPostCollectionIds` dans `src/db/posts.ts`
- [x] **Écran de sauvegarde réel** (`src/screens/save-post/`) : feuille unique
      (`@gorhom/bottom-sheet`), aperçu par badge de plateforme, collections en cases à cocher
      (création à la volée via un champ révélé par un bouton « + »), champ note,
      `react-hook-form` + validation Zod. Remplace l'écran de test `src/app/shareintent.tsx`
- [x] **Écriture transactionnelle** (`savePost` dans `src/db/posts.ts`) : upsert du post puis
      diff des rangements `post_collections` (insertion, résurrection d'une ligne supprimée,
      ou `deleted_at`) — jamais de vrai `DELETE`
  - ⚠️ Le driver `expo-sqlite` exécute les transactions Drizzle en synchrone : `.run()`/`.all()`
    dans le callback, pas de `await` (silencieusement ignoré par le driver)
- [x] **Retour à l'app d'origine** après sauvegarde (`BackHandler.exitApp()`) et **confirmation
      visuelle** (`react-native-toast-message` + `expo-haptics`), séquencés pour que le toast
      reste visible avant la fermeture
- [x] **Validé sur appareil réel** (25 août 2026) : trois plateformes avec notes et
      collections, doublon détecté et rouvert en édition, zéro collection accepté, partage
      texte brut (badge « ? », texte en note), mode sombre, clavier — sur les deux chemins de
      réception (app fermée et arrière-plan) — critère de fin de phase atteint
- [x] `eslint.config.js` généré (`eslint-config-expo`) — `npm run lint` (`expo lint`) casse sur
      une résolution de module, contourné avec `npx eslint .`

</details>

<details>
<summary>Phase 1 — Fondation données (24 août 2026)</summary>

- [x] Schéma Drizzle : `posts`, `collections`, `post_collections` (jointure N↔N), les 5
      colonnes de sync sur chacune — décisions consignées dans
      [ARCHITECTURE.md](./ARCHITECTURE.md) §4
- [x] Première migration générée — `src/db/migrations/0000_special_next_avengers.sql`
- [x] `src/db/index.ts` : base ouverte avec `enableChangeListener: true`, `newId()` (UUID natif)
- [x] `useMigrations` au démarrage (`src/app/_layout.tsx`), calque d'attente + calque d'erreur
- [x] `expo-clipboard` installé (préparation du « copier le lien » de la phase 3), versions
      SDK 57 réalignées (`expo-doctor` 21/21)
- [x] Rebuild natif — deux builds le 24 août : `82dbc870` sur le commit `471e31e` (sans
      `expo-clipboard` ni l'alignement de patch, commités après coup), puis `ca01f523` sur le
      commit `021e7fd` une fois la phase 1 committée. **C'est ce second build qui est sur
      l'appareil** — cf. [DEVELOPMENT.md](./DEVELOPMENT.md) §7 « EAS builde depuis `git HEAD` »
      pour ne pas reproduire le décalage
- [x] Banc d'essai (`DatabaseSmokeTest`) retiré de l'onglet Home une fois son rôle rempli
- [x] Validé sur appareil réel : les deux chemins de partage (app fermée / arrière-plan),
      écriture reflétée sans rechargement, persistance après redémarrage complet — reconfirmé
      fonctionnel sur le build final `ca01f523`

</details>

<details>
<summary>Phase 0 — Initialisation (21 août 2026)</summary>

- [x] Projet Expo SDK 57 créé et lié à EAS
- [x] Dépendances installées, `expo-doctor` 21/21
- [x] NativeWind 4.2.6 + Tailwind 3.4.19 configurés (versions épinglées)
- [x] React Native Reusables configuré — `rnr doctor` : All checks passed
- [x] `@gorhom/bottom-sheet` × Reanimated v4 validé sur appareil réel
- [x] `expo-share-intent` branché et testé de bout en bout (démarrage à froid + arrière-plan)
- [x] Routing restructuré en `(tabs)` + `Stack`
- [x] Squelette Drizzle (configuration + dossier de migrations)
- [x] Driver SQLite corrigé : `op-sqlite` → `expo-sqlite` (`useLiveQuery` inexistant sur op-sqlite)
- [x] Versions sensibles verrouillées, travail commité
- [x] Documentation du projet rédigée

</details>
