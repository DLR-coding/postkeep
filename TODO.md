# TODO — PostKeep

> Tâches concrètes, prêtes à être prises. Pour la vision d'ensemble : [ROADMAP.md](./ROADMAP.md).
>
> **Convention** : cocher une case au moment où la tâche est terminée **et vérifiée**,
> dans le même commit que le travail. Une tâche découverte en cours de route s'ajoute ici
> plutôt que de rester dans une tête.

Dernière mise à jour : 21 août 2026

---

## 🔴 Bloquant — Phase 1 (fondation données)

Rien d'autre ne peut avancer tant que ceci n'est pas fait.

- [ ] **Définir le schéma Drizzle** dans `src/db/schema.ts`
  - Tables : `posts`, `collections` (+ relation)
  - Les 5 colonnes obligatoires sur chaque table ([ARCHITECTURE.md](./ARCHITECTURE.md) §4)
  - `id` en `TEXT PRIMARY KEY`, généré côté client — **jamais** d'auto-increment
- [ ] **Générer la première migration** — `npx drizzle-kit generate`
- [ ] **Créer `src/db/index.ts`** : ouverture de la base avec `enableChangeListener: true`
  - ⚠️ Sans cette option, `useLiveQuery` ne réagira à aucun changement
- [ ] **Appliquer les migrations au démarrage** (`useMigrations` dans `src/app/_layout.tsx`),
      avec un état d'attente et un état d'erreur visibles à l'écran
- [ ] **Premier rebuild natif** pour intégrer `expo-sqlite` au dev client
  - `npx eas-cli build --profile development --platform android`
  - 💡 Grouper avec tout autre ajout natif prévu, pour ne consommer qu'un seul crédit EAS
- [ ] **Valider sur appareil** : écrire une ligne, redémarrer l'app, la retrouver

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
      l'analyse d'URL et la détection de plateforme (logique pure, sans interface)

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

- [ ] **Post partagé deux fois** : créer un doublon, ou mettre à jour l'existant ? (Phase 2)
- [ ] **Un post peut-il appartenir à plusieurs collections ?** Change le schéma —
      à trancher **avant** la première migration (Phase 1)
- [ ] **Collections et tags** : deux notions distinctes ou une seule ? (Phases 1 & 4)
- [ ] **Contenu partagé qui n'est pas une URL** (texte brut, capture d'écran) : accepter ou
      refuser ? La V1 ne déclare que `text/*` dans les filtres d'intention (Phase 2)
- [ ] **Rappels** : à quelle fréquence, et selon quel critère de pertinence ? (Phase 5)

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
