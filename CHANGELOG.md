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

Aucune version n'a encore été distribuée. L'app build et se lance, mais aucune
fonctionnalité produit n'est implémentée — voir [ROADMAP.md](./ROADMAP.md).

### Ajouté

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
- **Chaîne de build EAS** (`eas.json`) : profils `development`, `preview`, `production`
- Documentation du projet : `README`, `ARCHITECTURE`, `DEVELOPMENT`, `CONTRIBUTING`,
  `ROADMAP`, `TODO`, `CHANGELOG`

### Modifié

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
