# Roadmap — PostKeep

> Les phases de développement, dans l'ordre où elles doivent être faites, et **pourquoi**
> cet ordre.
> Pour les tâches concrètes à prendre maintenant : [TODO.md](./TODO.md).
>
> État au 11 novembre 2026 — dernière version publiée : **v0.2.0**.

**Principe directeur** : chaque phase produit quelque chose d'utilisable. On ne construit
pas six écrans à moitié en parallèle — on termine un parcours avant d'ouvrir le suivant.

---

## Vue d'ensemble

| Phase | Objectif | État |
|---|---|---|
| 0 | Initialisation technique | ✅ Terminée |
| 1 | Fondation données | ✅ Terminée |
| 2 | Capture — recevoir et sauvegarder un post | ✅ Terminée |
| 3 | Consultation — retrouver et rouvrir un post | ✅ Terminée |
| 4 | Organisation — chercher et filtrer | ✅ Terminée |
| 5 | Nettoyage — retirer le template, éponger la dette | ✅ Terminée |
| 6 | Distribution — APK public | 🟡 v0.1.0 puis v0.2.0 publiées ; restent icône/splash et test par un tiers |
| 7 | Polish — améliorations UI/UX en attente | 🟡 Refonte livrée en v0.2.0 ; reste l'icône « + » du picker |
| — | Livré hors plan initial (aperçu, paramètres, Reddit, grille…) | ✅ Publié en v0.2.0 |
| V1.5 | Rétention + synchronisation multi-appareils | 🟡 Synchro livrée sur la branche `feat/account-sync`, pas encore publiée ; rétention verrouillée jusqu'à la fin de V1 |

---

## Phase 0 — Initialisation technique ✅

**Objectif** : un projet qui build, se lance sur Android, et reçoit un partage.

Livré :

- Expo SDK 57 + NativeWind 4 + React Native Reusables configurés, `expo-doctor` 21/21
- `expo-share-intent` branché et testé de bout en bout sur appareil réel
- Structure de routing `(tabs)` + `Stack` compatible avec l'écran de partage
- Chaîne de build EAS (profils `development`, `preview`, `production`)
- Squelette Drizzle (configuration, dossier de migrations)
- Compatibilité `@gorhom/bottom-sheet` × Reanimated v4 vérifiée sur appareil

Détail historique : [INIT.md](./INIT.md) · Décisions retenues : [ARCHITECTURE.md](./ARCHITECTURE.md)

---

## Phase 1 — Fondation données ✅

**Objectif** : pouvoir écrire et lire des données persistantes.

C'est un **prérequis bloquant** pour toutes les phases suivantes : aucune fonctionnalité
produit ne peut exister sans stockage.

### Contenu

1. **Définir le schéma** dans `src/db/schema.ts` — tables `posts`, `collections`, et la
   relation entre les deux. Les 5 colonnes obligatoires
   ([ARCHITECTURE.md](./ARCHITECTURE.md) §4) sur chaque table.
2. **Générer la première migration** : `npx drizzle-kit generate`
3. **Créer le point d'accès à la base** (`src/db/index.ts`) avec
   `enableChangeListener: true` — sans ça, `useLiveQuery` ne réagira à rien.
4. **Appliquer les migrations au démarrage** avec `useMigrations`, dans le layout racine,
   avec un état d'attente et un état d'erreur visibles.
5. **Premier rebuild natif** — c'est ici que `expo-sqlite` entre réellement dans le dev client.
6. **Valider** par une écriture puis une lecture réelle sur appareil.

### Critère de fin

Écrire une ligne en base depuis l'app, redémarrer l'app, et la retrouver affichée.

---

## Phase 2 — Capture ✅

**Objectif** : le parcours principal du produit fonctionne de bout en bout.

> Partager un post depuis Instagram → choisir une ou plusieurs collections → écrire une note →
> c'est sauvegardé.

### Contenu

1. **Analyser l'URL partagée** : détecter la plateforme (Instagram, TikTok, X, Threads),
   extraire l'URL propre du texte partagé (les apps ajoutent souvent du texte autour)
2. **Écran de sauvegarde réel** — remplace l'écran de test actuel (`shareintent.tsx`) :
   - Aperçu = logo de la plateforme (pas de récupération de métadonnées à l'époque — remplacé
     en novembre 2026 par légende + miniature, cf. [Livré hors plan initial](#livré-hors-plan-initial)
     et ARCHITECTURE.md §6)
   - Choix des collections en **multi-sélection** (création à la volée incluse) — zéro
     collection est un état valide : le post existe, il n'est simplement rangé nulle part
   - Champ de note
   - `@gorhom/bottom-sheet` + `react-hook-form` + validation Zod
3. **Retour à l'app d'origine** après sauvegarde
4. **Confirmation visuelle** (`react-native-toast-message` + `expo-haptics`)

### Critère de fin

Partager trois posts de trois plateformes différentes, avec notes et collections, sans
quitter le parcours.

### Points d'attention

- Tester **les deux chemins de réception** (app fermée / app en arrière-plan) —
  cf. [ARCHITECTURE.md](./ARCHITECTURE.md) §7
- Le texte partagé n'est pas toujours une URL propre — prévoir les cas dégradés
- Un même post partagé deux fois : normaliser l'URL (fragment retiré ; query retirée pour les
  plateformes connues, conservée pour les autres URL comme YouTube `?v=…`) et rouvrir
  l'existant en édition plutôt que dupliquer — tranché, cf. [ARCHITECTURE.md](./ARCHITECTURE.md) §4

---

## Phase 3 — Consultation ✅

**Objectif** : retrouver et rouvrir ce qu'on a sauvegardé. Sans ça, la phase 2 ne sert à rien.

### Contenu

1. **Liste des posts** avec `@shopify/flash-list` (**pas** `FlatList` — les listes seront longues)
2. **Carte de post** : plateforme, note, collection, date
3. **Ouverture** : appui → `Linking.openURL()` → l'OS ouvre l'app d'origine
4. **Suppression** (logique — `deleted_at`, cf. ARCHITECTURE.md §4 « Deux niveaux de
   suppression ») : le balayage supprime le post dans « Tous les posts », mais l'ôte
   seulement de la collection dans une vue collection — libellés distincts obligatoires
5. **État vide** soigné — c'est le premier écran que verra un nouvel utilisateur

### Critère de fin

Voir tous ses posts, en rouvrir un dans Instagram, en supprimer un et qu'il ne revienne pas
après redémarrage.

---

## Phase 4 — Organisation ✅

**Objectif** : rester utilisable au-delà de quelques dizaines de posts.

### Contenu

1. **Recherche locale** (sur les notes et les URL)
2. **Filtre par collection**
3. **Gestion des collections** : renommer, supprimer, réorganiser, ranger un post existant
   dans une collection supplémentaire

### Critère de fin

Retrouver un post précis parmi une centaine en moins de dix secondes.

### Point d'attention

L'état des filtres (recherche active, collection sélectionnée) est de **l'état d'interface** :
il va dans Zustand, jamais en base.

---

## Phase 5 — Nettoyage template & dette technique ✅

**Objectif** : ne plus livrer un projet qui ressemble au template `create-expo-app`, et
solder la dette accumulée pendant les phases 2-4, avant de packager une distribution
publique.

### Contenu

1. **Retirer le contenu de démonstration** : onglet `explore.tsx`, composants template
   (`animated-icon*`, `hint-row`, `web-badge`, `external-link`, `themed-text`,
   `themed-view`), assets (`react-logo*`, `expo-badge*`, `expo-logo`, `logo-glow`,
   `tutorial-web`, `tabIcons/`), animation de démarrage `AnimatedSplashOverlay`
2. **Éponger la dette de configuration** : un seul fichier de thème (garder celui de React
   Native Reusables), un seul `global.css`, trancher le sort de `DESIGN.md`, créer
   `src/screens/` au premier écran qui le justifie
3. **Ajouter un dépôt distant** — le projet n'a aujourd'hui aucune sauvegarde hors machine

Détail des tâches : [TODO.md](./TODO.md)

### Critère de fin

Plus aucune trace du template Expo par défaut (composants, assets, animation de démarrage),
une seule source de vérité pour le thème, et le dépôt poussé sur un remote.

---

## Phase 6 — Distribution 🟡

**Objectif** : que quelqu'un d'autre puisse installer l'app.

### Contenu

1. **Configurer le profil `production` pour produire un APK** (actuellement il produit un
   AAB, format Play Store, non installable directement — cf. [TODO.md](./TODO.md))
2. Icône, écran de démarrage, nom d'app définitifs (retirer les éléments du template Expo)
3. Numéro de version cohérent (actuellement `1.0.0` par défaut du template)
4. Build de production + **GitHub Release** avec l'APK attaché
5. Instructions d'installation (autoriser les sources inconnues)

### Critère de fin

Un tiers installe l'app depuis GitHub et sauvegarde un post, sans aide.

> **Reporté après la phase 7** : contenu de la phase livré (build APK, branding, version,
> [GitHub Release v0.1.0](https://github.com/DLR-coding/postkeep/releases/tag/v0.1.0),
> instructions d'installation), mais ce test volontairement pas encore fait — l'app n'est pas
> jugée assez polie pour l'exposer à quelqu'un d'autre. Phase 6 ne se ferme (✅ dans le tableau
> ci-dessus) qu'une fois ce test passé, après la phase 7.

### État au 11 novembre 2026

- **v0.1.0** publiée le 4 septembre 2026, **v0.2.0** le 11 novembre 2026
  ([GitHub Release v0.2.0](https://github.com/DLR-coding/postkeep/releases/tag/v0.2.0), APK
  `postkeep-v0.2.0.apk`, vérifiée sur Galaxy S23)
- Fait : profil `production` en APK, nom « PostKeep », version alignée (`0.2.0` dans `app.json`
  et `package.json`), instructions d'installation
- Reste : **icône et écran de démarrage définitifs** (toujours le placeholder bookmark sur fond
  indigo) et le **test d'installation par un tiers**

---

## Phase 7 — Polish UI/UX 🟡

**Objectif** : corriger les frictions d'interface repérées pendant les tests des phases
précédentes, avant de considérer la V1 close.

### Contenu

1. Réagencer l'écran d'édition plein écran (collections en haut, note qui scroll seule)
2. `CollectionPickerSheet` : bouton « + » en icône plutôt qu'en pleine largeur
3. Dialog de confirmation de suppression d'un post custom (au lieu de l'`Alert.alert`
   natif) — même traitement que celui déjà fait sur les collections

Détail des tâches : [TODO.md](./TODO.md)

### Critère de fin

Les trois frictions repérées le 31 août 2026 sont corrigées et validées sur appareil.

Une fois cette phase close, reprendre le critère de fin de la phase 6 (test d'installation par
un tiers), en attente depuis le 4 septembre 2026.

### État au 11 novembre 2026

La refonte de l'interface (10-11 novembre 2026, livrée en v0.2.0 — conception :
[docs/superpowers/specs/2026-11-10-refonte-ui-design.md](./docs/superpowers/specs/2026-11-10-refonte-ui-design.md))
a absorbé deux des trois frictions :

- ✅ Écran d'édition réagencé (collections en haut, note qui défile seule)
- ✅ Dialog de suppression custom (`ConfirmDialog`) — remplace désormais **tous** les
  `Alert.alert` de l'app
- ⬜ Reste : l'icône « + » à droite de la recherche dans le picker de collections, à la place du
  bouton pleine largeur

---

## Livré hors plan initial

Ajouts qui ne figuraient dans aucune phase, livrés entre v0.1.0 et v0.2.0 (9-11 novembre 2026).
Détail : [TODO.md](./TODO.md) et `git log v0.1.0..v0.2.0`.

- **Aperçu légende + miniature** — récupérés une seule fois, au partage : Instagram/TikTok via
  une WebView cachée, X via oEmbed (légende seulement). Revient sur l'exclusion initiale des
  métadonnées, cf. [ARCHITECTURE.md](./ARCHITECTURE.md) §6
- **Refonte de l'interface** — barre flottante en verre, All posts en « fiches » avec filtres par
  plateforme et recherche surlignée, Collections en dossiers, feuilles restylées (cf. phase 7)
- **Système de design** — rayons, espacements et hauteurs partagés (`src/lib/design.ts`), jetons de
  thème, composants de feuille communs (`src/components/sheet-kit.tsx`)
- **Paramètres** — thème Système/Clair/Sombre, export JSON, emplacement « Sign in — Coming soon »
- **Reddit** reconnu comme plateforme (sans légende ni miniature pour l'instant)
- **Vue grille** dans All posts, bascule liste/grille mémorisée
- **Tri par date d'enregistrement** partout, cohérent avec la date affichée

### Prévu hors phases

- **Montée vers le SDK Expo 58** — sur une branche séparée, après la v0.2.0, sans bloquer la
  clôture des phases 6 et 7

---

## V1.5 — Rétention & synchronisation 🟡

**Rétention : ne rien installer avant la fin de la V1.** La synchronisation a été avancée
(décision du 11 novembre 2026) et livrée sur une branche, voir plus bas.

### Rétention

**Objectif** : que l'app soit relancée, au lieu de devenir un nouveau cimetière de liens —
le problème même qu'elle prétend résoudre.

1. **Rappels locaux** (`expo-notifications`) — sans backend, tout est planifié sur l'appareil
2. **Mode triage** : parcourir les posts jamais rouverts, un par un, pour les classer ou les jeter
3. **Statistiques légères** : combien de posts en attente, depuis quand

Critère de fin : recevoir un rappel pertinent et pouvoir trier dix posts en moins d'une minute.

### Synchronisation ✅ (branche `feat/account-sync`, non publiée)

Livrée le 11 novembre 2026 sur la branche `feat/account-sync`, **pas encore fusionnée ni
publiée** : reste la vérification sur appareil ([TODO.md](./TODO.md)). Conception :
`docs/superpowers/specs/2026-11-11-comptes-synchro-design.md` ; fonctionnement et décisions :
[ARCHITECTURE.md](./ARCHITECTURE.md) §12.

- **Compte optionnel**, email + mot de passe, dans la section « Account » des Paramètres
  (remplace « Sign in — Coming soon »)
- **Synchro + sauvegarde** entre les appareils d'un même compte : push/pull par delta,
  dernière écriture gagnante, au lancement, au retour au premier plan et quelques secondes
  après une modification
- **Données d'avant le compte rattachées** à la connexion, doublons fusionnés (même nom de
  collection, même URL de post)
- **Déconnexion** (le téléphone est vidé, les données restent dans le compte) et
  **suppression du compte**

Pile réellement utilisée :

```
Supabase                     Postgres + authentification (email + mot de passe) + RLS
@supabase/supabase-js        client, 100 % JS — aucun module natif, aucun rebuild
expo-sqlite/kv-store         session et état de synchro (déjà utilisé pour le thème)
src/lib/sync/                synchro maison sur updated_at / deleted_at / user_id
GitHub Actions (cron)        ping tous les 3 jours — évite la mise en pause du tier gratuit Supabase
```

**PowerSync écarté** (pressenti jusque-là, avec `@powersync/drizzle-driver` et
`@powersync/react-query`) : il instancie sa propre base, donc remplace la connexion
`expo-sqlite` et la réactivité `useLiveQuery` de tous les écrans ; il ajoute un module natif
et un service de plus entre l'app et Postgres. Pour un seul utilisateur par compte et trois
tables qui portaient déjà les colonnes de synchro, une synchro maison suffit. TanStack Query
n'est pas venu non plus : l'état de synchro tient dans un store Zustand.

Restent avant d'ouvrir les comptes à d'autres personnes : un SMTP + un nom de domaine
(confirmation d'email, mot de passe oublié) — voir [TODO.md](./TODO.md).

**Ce qui a rendu cette phase possible** : le schéma respecte les règles de synchronisation
depuis le premier jour ([ARCHITECTURE.md](./ARCHITECTURE.md) §4) — `user_id` nullable
compris, qui sert au rattachement des données d'avant le compte. La synchro n'a demandé
**aucune migration du schéma local**.

---

## Hors périmètre

Décidé, à ne pas re-débattre sans raison nouvelle :

| Exclu | Raison |
|---|---|
| iOS | Après la V1 Android. Coût de compte développeur + surface de test doublée |
| Contenus embarqués (lire le post dans l'app) | Lourd, fragile, souvent bloqué par les plateformes. La WebView cachée sert uniquement à lire légende et miniature au partage (ARCHITECTURE.md §6) |
| Récupération de métadonnées côté serveur | IP de datacenter bloquées (Edge Function Supabase testée et abandonnée) et contrainte de coût zéro. Les métadonnées sont lues sur l'appareil, une seule fois, au partage |
| Compte obligatoire | Contredit la promesse « utile dès la première seconde » |
