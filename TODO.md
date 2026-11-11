# TODO — PostKeep

> Tâches concrètes, prêtes à être prises. Pour la vision d'ensemble : [ROADMAP.md](./ROADMAP.md).
>
> **Convention** : cocher une case au moment où la tâche est terminée **et vérifiée**,
> dans le même commit que le travail. Une tâche découverte en cours de route s'ajoute ici
> plutôt que de rester dans une tête.

Dernière mise à jour : 11 novembre 2026

---

## 🟠 À vérifier sur l'APK v0.2.0 (usage réel)

Livré et installé (Galaxy S23, APK release), mais pas encore exercé en usage quotidien :

- [ ] **L'écran de partage ne se rouvre plus** au rechargement : l'intention de partage est
      réinitialisée au démontage de l'écran — correctif à confirmer sur l'APK de production
- [ ] **Édition d'un post** : enregistrer après avoir coché/décoché des collections, et
      « + New » depuis l'édition (non testé sur appareil pendant la refonte)
- [ ] **Légende et miniature Instagram/TikTok** récupérées par la WebView cachée sur des
      partages réels

---

## 🟠 Compte et synchronisation — branche `feat/account-sync` (non publiée)

Code livré le 11 novembre 2026 (59 tests unitaires au vert), pas encore vérifié sur
appareil. Fonctionnement : [ARCHITECTURE.md](./ARCHITECTURE.md) §12 ; procédures (migration,
mot de passe, keepalive, sauvegarde de la base) : [DEVELOPMENT.md](./DEVELOPMENT.md) §9.

**Vérification sur appareil** — compte de test dédié, **jamais le vrai compte** pour les
tests destructifs, et base du téléphone sauvegardée hors du dépôt avant la première
connexion (`run-as … cat files/SQLite/postkeep.db`, DEVELOPMENT.md §9) :

- [x] Sans compte : l'app se comporte comme avant (rien de plus hors des Paramètres)
      (11 novembre 2026, Galaxy S23)
- [x] Création de compte avec des posts existants → tout est rattaché, visible dans Supabase
      (39 posts, 18 collections, 50 rangements, identiques à la base locale)
- [x] Modification sur le téléphone → poussée en quelques secondes ; pas de synchro en
      boucle (`server_updated_at` stable après coup)
- [x] Modification simulée d'un « autre appareil » (curl avec le jeton du compte,
      `updated_at` plus récent) → visible après retour au premier plan, liste rafraîchie
      seule, y compris quand seul un rangement change
- [ ] Mode avion : modification sans erreur bloquante ; déconnexion refusée avec le message
      — **non testé** : le PC passe par le partage de connexion du téléphone, couper le
      réseau du téléphone coupe aussi la session de test
- [x] Déconnexion → téléphone vide, liste vidée aussitôt (bug trouvé et corrigé : un DELETE
      sans WHERE ne prévenait pas `useLiveQuery`) ; reconnexion → tout revient
- [x] Deuxième compte : ne voit rien du premier — vérifié côté serveur (RLS, deux comptes
      de test en curl), pas sur le téléphone
- [ ] Fusion des doublons à la connexion avec deux appareils ayant des posts sans compte —
      **non testé** (un seul téléphone) ; couvert par les tests de `planGuestMerge`
- [x] Suppression du compte de test → plus rien côté serveur ni sur le téléphone ; base du
      téléphone restaurée ensuite depuis la sauvegarde
- [x] `npx expo-doctor@1.20.5` 21/21, doctor RNR, types, lint, 59 tests
- [ ] Premier passage planifié du workflow keepalive, une fois la branche fusionnée dans
      `master` (un `schedule` ne part que de la branche par défaut)

**À faire avant d'ouvrir les comptes à d'autres personnes :**

- [ ] **SMTP + nom de domaine** (Resend, par exemple) branchés sur Supabase. Permet de
      réactiver la confirmation d'email (`mailer_autoconfirm` repassé à `false`) et
      d'ajouter « mot de passe oublié ». Aujourd'hui : rien ne prouve qu'une adresse
      appartient à celui qui s'inscrit, et un mot de passe oublié se réinitialise à la main
      depuis le tableau de bord (DEVELOPMENT.md §9)

**Risque connu, ouvert :**

- [x] **Session terminée sans notre `signOut()`** — corrigé le 11 novembre 2026 : la première
      synchro d'un autre compte supprime d'abord ces lignes (`dropOtherAccountRows`). Pas vu
      sur appareil. (jeton de rafraîchissement révoqué,
      session expirée côté serveur…) : l'app passe en mode sans compte sans vider la base.
      Les lignes de l'ancien compte restent sur le téléphone et s'afficheraient sous un autre
      compte connecté ensuite (les lectures ne filtrent pas sur `user_id` ; le push, lui, ne
      les enverrait pas dans ce compte). Piste : vider la base, ou la marquer, quand la
      session disparaît sans passer par `signOut()`

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
- [x] **Release v0.2.0** — [GitHub Release v0.2.0](https://github.com/DLR-coding/postkeep/releases/tag/v0.2.0)
      avec `postkeep-v0.2.0.apk`, build EAS `production` `8c851dba` sur le commit `01aa3aa`,
      installé et vérifié sur Galaxy S23 (11 novembre 2026). La release garde l'APK : les
      artefacts EAS expirent
- [ ] **Critère de fin de phase** : un tiers installe l'app depuis la release et sauvegarde un
      post sans aide — **reporté après la phase 7** (4 septembre 2026) : app pas encore jugée
      assez polie pour être exposée à quelqu'un d'autre

---

## 🟢 Phase 7 — Polish UI/UX (repérées le 31 août 2026)

- [x] **Écran d'édition plein écran — réagencer** (fait dans la refonte, 10 novembre 2026) : collections en pastilles sur 2 lignes
      scrollables **en haut**, champ Note en dessous qui prend le reste de la page. C'est le champ
      Note qui doit scroller (pas la page), pour toujours voir le début du texte au lieu de
      seulement la fin quand la note est longue
- [x] **`CollectionPickerSheet` (feuille empilée du picker de collections)** : le bouton
      pleine largeur « + New collection » est remplacé par une icône « + » à droite de la barre
      de recherche ; sous 7 collections (pas de recherche), par la puce « + New » en pointillés
      en fin de liste, la même qu'en édition (11 novembre 2026). Pas encore vu sur appareil
- [x] **Dialog de confirmation de suppression d'un post (mode édition)** : l'`Alert.alert` natif
      est remplacé par `ConfirmDialog` (`src/components/sheet-kit.tsx`), rendu dans la feuille
      plein écran via un `PortalHost` dédié (`SHEET_PORTAL`) — le même composant sert au
      balayage et à la suppression d'une collection ; plus aucun `Alert.alert` dans `src/`
      (11 novembre 2026, livré en v0.2.0)
  - Connu et accepté : en édition, le pied de la feuille n'est pas assombri sous le dialog

## 🟢 Aperçu des posts — par plateforme

État actuel par plateforme — voir [ARCHITECTURE.md](./ARCHITECTURE.md) §6 :
| Plateforme | Caption | Miniature |
|---|---|---|
| Instagram | ✅ WebView | ✅ WebView |
| TikTok | ✅ WebView | ✅ WebView |
| X | ✅ oEmbed | ❌ |
| Threads | ❌ | ❌ |
| Reddit | ✅ RSS du post, sinon oEmbed | ✅ RSS du post (`media:thumbnail`) |
| YouTube et autres liens | lien seul (non reconnu comme plateforme, query conservée) | ❌ |

- [x] *(Option)* **Légende et miniature Reddit** via le flux RSS public du post (repli :
      oEmbed officiel, titre seul) — fait le 11 novembre 2026, vérifié sur appareil (partage
      d'un post r/pics sur le compte de dev : titre + miniature, synchronisés). Liens courts
      `redd.it`/`/s/` : titre seul

## 🟤 Dette technique

- [x] `scrapeMetaTags` (`src/lib/oembed.ts`) : code mort depuis l'abandon du scraping
      Instagram/TikTok au profit de la WebView cachée — supprimé (11 novembre 2026)
- [x] `npm test` (`node --test`) lançait 0 test sous Node 22.13 — le script liste
      maintenant les dossiers de tests explicitement (11 novembre 2026)
- [x] Erreur lint dans `src/hooks/use-color-scheme.web.ts` (`react-hooks/set-state-in-effect`)
      — `useSyncExternalStore` à la place de l'effet (11 novembre 2026)
- [x] [ARCHITECTURE.md](./ARCHITECTURE.md) §4 : la normalisation d'URL décrite ne dit pas que
      la query est conservée pour les liens non reconnus (YouTube `?v=…`)
- [x] Filtre Threads absent des pilules alors que Threads est reconnu — ajouté (11 novembre 2026)
- [x] `versionCode` resté à 1 en v0.2.0 : `autoIncrement` ajouté au profil `production`
      d'`eas.json` (11 novembre 2026)
- [x] Date « 8 Sept » en septembre (`Intl` en `en-GB`) : mois écrits à la main, « 8 Sep »
      (11 novembre 2026)
- [x] `src/app/(tabs)/index.tsx` (151 lignes) déplacé dans `src/screens/posts/` (règle des
      ~80 lignes de CONTRIBUTING.md) (11 novembre 2026)
- [x] Supprimer `handoff.txt` (notes de session non suivies, à la racine)

## ⏭️ Ensuite

Après la V1 (phases 6 et 7 closes), sans rien en installer avant — détail dans
[ROADMAP.md](./ROADMAP.md) :

- **V1.5** : rétention (rappels, triage). Comptes et synchronisation : avancés, voir plus haut
- **Montée vers le SDK 58**, sur une branche séparée

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
<summary>v0.2.0 — Refonte, aperçus, paramètres (7 septembre – 11 novembre 2026)</summary>

Détail côté utilisateur : [CHANGELOG.md](./CHANGELOG.md) §0.2.0.

**Aperçu des posts — caption et miniature via WebView**

- [x] Colonnes `posts.caption` / `posts.thumbnail_url` (migration `0002`)
- [x] oEmbed X/Twitter fonctionne (`api.twitter.com/1/statuses/oembed.json`) → caption ✅
- [x] **WebView cachée** (`src/lib/webview-metadata.tsx`) pour Instagram/TikTok → caption ✅, miniature ✅
      — l'Edge Function Supabase a été abandonnée (IP de datacenter bloquées par les plateformes)
- [x] Extraction fallback du texte partagé (`extractCaptionFromText`)
- [x] Query string conservée pour les URLs non reconnues (YouTube `?v=…`)
- [x] **Nouveau build EAS** avec `react-native-webview` (module natif) : build `production`
      `8c851dba` de la v0.2.0 (11 novembre 2026)

**Refonte de l'interface** — conception : [docs/superpowers/specs/2026-11-10-refonte-ui-design.md](./docs/superpowers/specs/2026-11-10-refonte-ui-design.md)

- [x] Barre flottante en verre dépoli (recherche + onglets), remplace `NativeTabs`
- [x] All posts en lignes « Fiche » (vignette 9:16, légende, note, collections), filtres par
      plateforme, recherche avec surlignage
- [x] Collections en dossiers (miniatures récentes, plateforme dominante, « + » en haut)
- [x] Feuille de détail restylée ; en édition la note défile seule et reste visible au clavier
- [x] Système de design : `src/lib/design.ts` (rayons, espacements, hauteur des contrôles),
      jetons de thème, `src/components/sheet-kit.tsx`, puces de collection teintées
      (`src/lib/collection-tint.ts`)
- [x] Écran de partage restylé ; intention de partage réinitialisée au démontage (à confirmer
      en usage réel, voir « À vérifier sur l'APK v0.2.0 »)
- [x] Vérifié sur appareil (Galaxy S23), clair et sombre

**Après la refonte (11 novembre 2026)**

- [x] Confirmations de suppression en `ConfirmDialog` partout (voir Phase 7)
- [x] **Paramètres** (`src/components/settings-sheet.tsx`, bouton ⚙ de All posts) : thème
      Système/Clair/Sombre (kv-store expo-sqlite, clé `theme`), export JSON, « Sign in — Coming
      soon », lien code source + version
- [x] **Reddit** reconnu (`reddit.com`, `redd.it`, couleur `#FF4500`)
- [x] Tri par date d'enregistrement (`createdAt` décroissant) partout ; date affichée par
      `formatPostDate` (« 8 Nov », ou « 3 Mar 2025 » pour une autre année)
- [x] **Vue grille** 3 colonnes dans All posts (`src/components/post-grid-cell.tsx`), bascule
      liste/grille mémorisée (kv-store, clé `postsLayout`)
- [x] Release v0.2.0 publiée et installée sur Galaxy S23 (voir Phase 6)

</details>

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
