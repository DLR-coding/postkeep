# Roadmap — PostKeep

> Les phases de développement, dans l'ordre où elles doivent être faites, et **pourquoi**
> cet ordre.
> Pour les tâches concrètes à prendre maintenant : [TODO.md](./TODO.md).

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
| 4 | Organisation — chercher et filtrer | ⏳ **En cours** |
| 5 | Rétention — rappels et triage | ⬜ |
| 6 | Distribution — APK public | ⬜ |
| V1.5 | Synchronisation multi-appareils | 🔒 Verrouillée jusqu'à la fin de V1 |

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
   - Aperçu = logo de la plateforme (pas de récupération de métadonnées, cf. ARCHITECTURE.md §6)
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
- Un même post partagé deux fois : normaliser l'URL (query + fragment retirés) et rouvrir
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

## Phase 4 — Organisation ⏳

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

## Phase 5 — Rétention

**Objectif** : que l'app soit relancée, au lieu de devenir un nouveau cimetière de liens —
le problème même qu'elle prétend résoudre.

### Contenu

1. **Rappels locaux** (`expo-notifications`) — sans backend, tout est planifié sur l'appareil
2. **Mode triage** : parcourir les posts jamais rouverts, un par un, pour les classer ou les jeter
3. **Statistiques légères** : combien de posts en attente, depuis quand

### Critère de fin

Recevoir un rappel pertinent et pouvoir trier dix posts en moins d'une minute.

---

## Phase 6 — Distribution

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

---

## V1.5 — Synchronisation 🔒

**Ne rien installer de tout ça avant la fin de la V1.**

```
Supabase                     Postgres + authentification + RLS
@powersync/react-native      moteur de synchronisation SQLite ↔ Postgres
@powersync/drizzle-driver    conserve la syntaxe Drizzle de la V1
@powersync/react-query       état réseau (synchro en cours, erreurs)
GitHub Actions (cron)        ping tous les 3 jours — évite la mise en pause du tier gratuit Supabase
```

**Le compte utilisateur sera optionnel** — jamais un mur d'inscription au lancement.
Les données créées avant inscription seront rattachées a posteriori, d'où la colonne
`user_id` nullable prévue dès la V1.

**Ce qui rend cette phase possible** : le schéma respecte les règles de synchronisation
depuis le premier jour ([ARCHITECTURE.md](./ARCHITECTURE.md) §4). Sans ça, il faudrait
migrer le schéma sur des appareils contenant déjà des données réelles.

---

## Hors périmètre

Décidé, à ne pas re-débattre sans raison nouvelle :

| Exclu | Raison |
|---|---|
| iOS | Après la V1 Android. Coût de compte développeur + surface de test doublée |
| WebView / contenus embarqués | Lourd, fragile, souvent bloqué par les plateformes |
| Récupération de métadonnées Open Graph | Casse la promesse hors-ligne et la contrainte de coût zéro |
| Compte obligatoire | Contredit la promesse « utile dès la première seconde » |
