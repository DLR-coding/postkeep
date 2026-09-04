# TODO — PostKeep

> Tâches concrètes, prêtes à être prises. Pour la vision d'ensemble : [ROADMAP.md](./ROADMAP.md).
>
> **Convention** : cocher une case au moment où la tâche est terminée **et vérifiée**,
> dans le même commit que le travail. Une tâche découverte en cours de route s'ajoute ici
> plutôt que de rester dans une tête.

Dernière mise à jour : 4 septembre 2026

---

## 🟡 Phase 6 — Distribution

- [x] **`eas.json` : ajouter `"buildType": "apk"` au profil `production`** (4 septembre 2026)
- [x] **Numéro de version** : `0.1.0` dans `app.json` et `package.json` (4 septembre 2026)
- [x] **Nom affiché** : `"PostKeep"` dans `app.json` (4 septembre 2026)
- [ ] **Icône et écran de démarrage définitifs** — placeholder posé (glyphe bookmark, fond
      indigo `#6366F1`) le temps qu'une vraie direction artistique soit tranchée ; toujours pas
      les visuels finaux
- [x] Instructions d'installation — dans les notes de la
      [GitHub Release v0.1.0](https://github.com/DLR-coding/postkeep/releases/tag/v0.1.0)
      (4 septembre 2026)
- [ ] **Critère de fin de phase** : un tiers installe l'app depuis la release et sauvegarde un
      post sans aide — pas encore testé par quelqu'un d'autre que Dylan

---

## 🟢 Phase 7 — Polish UI/UX (repérées le 31 août 2026)

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

## 🔵 Questions ouvertes — à trancher avant de coder la fonctionnalité concernée

Ce ne sont pas des tâches mais des décisions produit qui bloqueront le code le moment venu.

- [ ] **Rappels** : à quelle fréquence, et selon quel critère de pertinence ? (V1.5 — Rétention)
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
<summary>Phase 5 — Nettoyage template & dette technique (3 septembre 2026)</summary>

- [x] **Contenu de démonstration supprimé** : composants template (`animated-icon*` +
      `.web.tsx`/`.module.css`, `hint-row`, `web-badge`, `external-link`, `themed-text`,
      `themed-view`, `app-tabs.web.tsx` — variante web, hors périmètre — `ui/collapsible.tsx`,
      mort depuis la suppression d'`explore.tsx` en phase 4), assets (`react-logo*`,
      `expo-badge*`, `expo-logo`, `logo-glow`, `tutorial-web`), animation de démarrage
      `AnimatedSplashOverlay` (remplacée par `SplashScreen.hideAsync()` standard une fois les
      migrations résolues, `src/app/_layout.tsx`) — c'était la cause du micro-saccade au
      lancement signalé en test (deux animations de 600 ms désynchronisées, comportement du
      template)
  - `assets/images/tabIcons/home.png` + `collections.png` **conservés** : pas des reliquats,
    ce sont les vraies icônes (maison, dossier) de la tab bar actuelle, encore utilisées par
    `app-tabs.tsx`
- [x] **Dette de configuration épongée** : `src/constants/theme.ts` supprimé après migration de
      son dernier appelant (`app-tabs.tsx`) vers `src/lib/theme.ts` (React Native Reusables,
      seule source de vérité restante) ; `src/global.css` supprimé avec lui (n'était importé
      que par ce fichier) ; `DESIGN.md` supprimé (charte du site marketing d'Expo, aucune
      référence dans le code) ; convention `src/screens/` déjà en place depuis les phases 2-4
- [x] **Dépôt distant** : déjà en place (`origin` → `github.com/DLR-coding/postkeep.git`)
- [x] **Validé sur appareil réel** (3 septembre 2026) : tab bar, splash, cycle share→save —
      critère de fin de phase atteint (voir [ROADMAP.md](./ROADMAP.md#phase-5--nettoyage-template--dette-technique))

</details>

<details>
<summary>Phase 4 — Organisation (3 septembre 2026)</summary>

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
- [x] **Nouvelles requêtes** dans `src/db/collections.ts` : liste des collections actives + compte
      de posts par collection ; posts filtrés par `collectionId` (variante d'`activePostsQuery`)
      — validé sur appareil (exercées tout au long des tests Collections ci-dessus)
- [x] **Recherche locale** sur les notes et les URL des posts — barre de recherche dans l'onglet
      « Tous les posts » (`src/app/(tabs)/index.tsx`), filtre en mémoire sur `note`/`url`
      (`includes` insensible à la casse), même style que la barre de l'onglet Collections mais
      indépendante — celle-ci ne filtre que les noms de collections
      (`src/screens/collections/index.tsx`). État de filtre en `useState` local (pas de Zustand :
      pas besoin de survivre à un changement d'onglet, cohérent avec le choix déjà fait sur la
      recherche Collections)
- [x] **Validé sur appareil réel** (3 septembre 2026) : critère de fin de phase atteint (voir
      [ROADMAP.md](./ROADMAP.md#phase-4--organisation))

</details>

<details>
<summary>Phase 3 — Consultation (1er septembre 2026)</summary>

- [x] **Liste des posts** (`@shopify/flash-list`, `(tabs)/index.tsx`), **carte de post**
      (plateforme déduite de l'URL, note, badges de collection tronqués à 3 + `+N`, date —
      `src/components/post-card.tsx`), **état vide** soigné
- [x] **Ouverture** (`Linking.openURL()`, pas de WebView) via le bouton « Ouvrir dans X » de la
      sheet d'aperçu — le tap sur la carte ouvre l'aperçu plutôt que d'ouvrir directement
      (déviation volontaire de ROADMAP.md, actée pendant la fusion sheet/édition ci-dessous)
- [x] **Suppression logique à deux niveaux** (`deleted_at`) : le balayage supprime réellement
      dans « Tous les posts »/« Sans collection », mais ne fait que retirer le post de la
      collection courante dans une vraie vue collection (2 boutons distincts, « Retirer » orange
      / « Supprimer » rouge) — suppression réelle toujours possible depuis une vue collection via
      le second bouton
- [x] **Fusion de la sheet de détail et de l'écran d'édition** en un seul composant plein écran
      morphant (pattern « Now Playing », `src/components/post-detail-sheet.tsx`), à la place de
      la route séparée `post/[id]/edit` : `backgroundComponent`/`handleComponent` custom animés
      sur `animatedIndex`, `topInset={0}`, `enablePanDownToClose` désactivé en plein écran,
      bouton retour Android re-snap à 50 % plutôt que fermeture. Clavier validé
      (`BottomSheetTextInput` + `keyboardBehavior="fillParent"`) sur le textarea Note et la
      recherche du picker de collections en plein écran — risque initial (raison d'être de
      l'ancienne séparation sheet/écran) levé après vérification Context7 de
      `@gorhom/bottom-sheet` v5.2.6
- [x] **Collections sous « Note » en mode édition** : chips retirables horizontales
      (`PostFieldsForm` prop `variant: 'picker' | 'chips'`), chip finale « + » ouvrant le picker
      complet dans une feuille empilée (`CollectionPickerSheet`, `stackBehavior="push"`)
- [x] **Bugs de réactivité `useLiveQuery` corrigés** : `drizzle-orm/expo-sqlite` n'écoute que la
      table du `.from()` racine d'une requête, jamais les tables jointes
      (`node_modules/drizzle-orm/expo-sqlite/query.js`) — `savePost`, `removePostFromCollection`
      et `softDeletePost` (`src/db/posts.ts`) touchent maintenant aussi `updated_at` sur les
      tables racines des requêtes affectées (`posts`, `collections`) en plus de la table qu'ils
      modifient réellement
- [x] **Validé sur appareil réel** (1er septembre 2026) : voir tous ses posts, en rouvrir un dans
      son app d'origine, en supprimer un et qu'il ne revienne pas après redémarrage — critère de
      fin de phase atteint

</details>

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
