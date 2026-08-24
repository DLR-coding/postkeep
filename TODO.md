# TODO — PostKeep

> Tâches concrètes, prêtes à être prises. Pour la vision d'ensemble : [ROADMAP.md](./ROADMAP.md).
>
> **Convention** : cocher une case au moment où la tâche est terminée **et vérifiée**,
> dans le même commit que le travail. Une tâche découverte en cours de route s'ajoute ici
> plutôt que de rester dans une tête.

Dernière mise à jour : 22 août 2026

---

## 🔴 Bloquant — Phase 1 (fondation données)

Rien d'autre ne peut avancer tant que ceci n'est pas fait.

- [x] **Définir le schéma Drizzle** dans `src/db/schema.ts` — tables `posts`, `collections` et
      `post_collections`, les 5 colonnes obligatoires sur chacune, `id` en `TEXT PRIMARY KEY`
- [x] **Générer la première migration** — `src/db/migrations/0000_special_next_avengers.sql`
- [x] **Créer `src/db/index.ts`** : base ouverte avec `enableChangeListener: true`,
      plus `newId()` (UUID natif d'`expo-modules-core`)
- [x] **Appliquer les migrations au démarrage** — `useMigrations` dans `src/app/_layout.tsx`,
      avec calque d'attente et calque d'erreur
- [x] **Premier rebuild natif** — build `82dbc870` du 24 août 2026, sur le commit `471e31e`
  - ⚠️ **`expo-clipboard` n'est pas dedans** : installé le 24 mais non commité au moment du
    build, et EAS builde depuis `git HEAD` (cf. [DEVELOPMENT.md](./DEVELOPMENT.md) §7).
    **Ne pas l'importer avant le prochain build.** Pas nécessaire avant la phase 3.
  - 📝 Côté natif l'APK est en `expo` 57.0.15 alors que l'arbre de travail est en ~57.0.16 :
    écart de patch, sans conséquence pratique, résorbé au prochain build
  - 📝 Un build embarque les modules natifs présents dans `package.json` **au moment du build**
    (autolinking). Le tableau `plugins` d'`app.json` ne sert qu'aux *config plugins*, ceux qui
    modifient le projet natif — un module sans config plugin est embarqué sans y figurer.
  - ✅ Contient tout ce que les phases 1 à 3 demandent : `expo-sqlite`, `expo-share-intent`,
    `expo-haptics`, `expo-notifications`, `@shopify/flash-list`, `react-native-svg`,
    `react-native-keyboard-controller`. Le retour à l'app d'origine après sauvegarde passe
    par `BackHandler.exitApp()` du cœur de RN — `expo-share-intent` ne fournit rien pour ça,
    seulement `resetShareIntent()`.
  - 💡 Un second build sera de toute façon nécessaire en phase 6 (icône, splash, nom, version) :
    la configuration du plugin `expo-notifications` (icône et couleur) voyagera avec celui-là
- [x] **Partage vérifié sur appareil réel** (24 août 2026, build `82dbc870`) — les deux
      chemins fonctionnent : app fermée (`+native-intent.tsx` redirige vers `/shareintent`
      après connexion au dev server) et app en arrière-plan (le provider racine navigue
      directement, cf. [ARCHITECTURE.md](./ARCHITECTURE.md) §7)
- [x] **Validé sur appareil réel** (24 août 2026) : le compteur s'incrémente sans
      rechargement (`enableChangeListener` fonctionne) et le compte persiste après
      redémarrage complet de l'app — critère de fin de la phase 1 atteint

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
- [ ] Remplacer l'écran de test `src/app/shareintent.tsx` par le vrai écran de sauvegarde
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

- [ ] **Configurer ESLint** — `npm run lint` existe (`expo lint`) mais aucun fichier de
      configuration n'est présent ; la commande propose de le créer au premier lancement
- [ ] **Ajouter un dépôt distant** — le projet est en local uniquement (`git remote -v` est vide),
      donc aucune sauvegarde hors de cette machine
- [ ] **Mettre en place des tests** — aucune suite automatisée. Commencer par le plus rentable :
      l'analyse d'URL (extraction, normalisation) et la détection de plateforme — logique pure,
      sans interface, et c'est elle qui décide si un doublon est détecté ou non

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
