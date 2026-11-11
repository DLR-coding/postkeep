# Contribuer à PostKeep

> Guide destiné à un développeur qui rejoint le projet.
> Il couvre l'installation, les conventions de code, le workflow git et la checklist
> avant de proposer une modification.
>
> Prérequis de lecture : [DEVELOPMENT.md](./DEVELOPMENT.md) (comment lancer le projet)
> et [ARCHITECTURE.md](./ARCHITECTURE.md) (les règles à ne pas casser).

---

## 1. Installation

```bash
git clone <url-du-repo>
cd postkeep
nvm use        # Node 22, épinglé dans .nvmrc
npm install
```

Il faut ensuite un **development build** installé sur un téléphone Android — Expo Go ne
fonctionne pas sur ce projet. Deux cas :

- **Quelqu'un vous fournit un lien de build** → l'ouvrir sur le téléphone, installer l'APK
- **Vous devez en construire un** → `npx eas-cli build --profile development --platform android`
  (nécessite un accès au projet EAS ; sinon demandez un lien à un membre de l'équipe)

Puis :

```bash
npx expo start --dev-client
```

Le détail (connexion au serveur, dépannage réseau) est dans [DEVELOPMENT.md](./DEVELOPMENT.md) §3.

---

## 2. Vérifier que tout va bien

Trois commandes, à lancer avant et après toute modification de dépendances :

```bash
npx expo-doctor                                # doit afficher 21/21
npx expo install --check                       # doit afficher "Dependencies are up to date"
npx @react-native-reusables/cli doctor --yes   # doit afficher "All checks passed"
```

Si `expo-doctor` signale un décalage de versions patch : `npx expo install --fix`.
C'est normal, Expo publie des correctifs régulièrement.

---

## 3. Conventions de code

### Nommage des fichiers

**kebab-case** pour tous les fichiers, comme le template Expo :

```
✅ post-card.tsx        ✅ use-collections.ts       ✅ format-date.ts
❌ PostCard.tsx         ❌ useCollections.ts        ❌ formatDate.ts
```

Exception : les fichiers de route `expo-router` suivent la convention du router
(`_layout.tsx`, `+native-intent.tsx`, `[id].tsx`).

### Où mettre quoi

| Type de fichier | Emplacement |
|---|---|
| Route (= un écran adressable) | `src/app/` — **uniquement des routes ici** |
| Corps d'un écran complexe | `src/screens/<nom>/index.tsx` |
| Composant réutilisé ailleurs | `src/components/` |
| Composant utilisé par un seul écran | à côté de cet écran, dans `src/screens/<nom>/` |
| Composant d'interface générique (RNR) | `src/components/ui/` — généré par le CLI, modifiable |
| Helper autonome | `src/lib/` |
| Hook réutilisable | `src/hooks/` |
| Store Zustand (état d'interface uniquement) | `src/stores/` |
| Schéma & accès base | `src/db/` |

**Règle importante** : `src/app/` ne contient **que** des routes. Chaque fichier y devient
une URL. Un écran qui dépasse ~80 lignes doit être déplacé dans `src/screens/`, la route se
contentant de le rendre :

```tsx
// src/app/(tabs)/collections.tsx
import { CollectionsScreen } from '@/screens/collections';

export default function CollectionsRoute() {
  // Uniquement les préoccupations de routing ici (paramètres d'URL, etc.)
  return <CollectionsScreen />;
}
```

**Pourquoi** : sans cette séparation, les écrans grossissent dans `src/app/` et deviennent
impossibles à réutiliser ou à tester.

### Style

Tout le style passe par **NativeWind** (classes Tailwind via `className`) :

```tsx
<View className="flex-1 gap-4 bg-background p-6">
```

- Utiliser les **couleurs du thème** (`bg-background`, `text-foreground`, `border-border`…),
  jamais des couleurs en dur — sinon le mode sombre casse
  - Là où `className` ne s'applique pas (composants tiers comme `@gorhom/bottom-sheet`,
    styles calculés), lire la couleur dans `THEME[colorScheme]` (`src/lib/theme.ts`) et la
    passer en `style`
  - Un nouveau jeton de couleur se déclare à **trois endroits**, avec les mêmes valeurs :
    `global.css` (`:root` et `.dark:root`), `tailwind.config.js` et `THEME`
  - Exceptions admises, pour ce qui ne doit pas changer avec le thème : couleurs de marque
    des plateformes (`PLATFORM_META` dans `src/lib/share-url.ts`), texte blanc posé sur ces
    fonds, ombres, surlignage de la recherche
- **Rayons, espacements et hauteur des contrôles** : jetons de `src/lib/design.ts`
  (`RADIUS`, `SPACE`, `CONTROL_HEIGHT`), pas de valeur inventée écran par écran
- Pour les composants texte, utiliser `Text` de `@/components/ui/text`, **pas** celui de
  `react-native` : celui de RNR applique `text-foreground` automatiquement
  - Exception : il impose aussi `text-base` (taille et hauteur de ligne), donc pour un texte
    imbriqué qui doit hériter de la taille du parent, ou une puce compacte, prendre le `Text`
    de `react-native` **avec une couleur explicite** issue de `THEME` — et laisser un
    commentaire qui dit pourquoi (exemples : `src/components/collection-chip.tsx`,
    `src/components/post-thumb.tsx`)

> 🐛 **Piège vécu** : utiliser le `Text` brut de `react-native` donne du texte noir sur fond
> noir en mode sombre, parce qu'il n'a aucune couleur par défaut.

### Composants d'interface

Ne pas écrire un bouton/carte/champ à la main s'il existe chez React Native Reusables :

```bash
npx @react-native-reusables/cli@latest add card --yes
```

Le CLI **copie le code source** dans `src/components/ui/` — ce sont ensuite vos fichiers,
modifiables librement.

Pour les feuilles du bas et les confirmations, réutiliser `src/components/sheet-kit.tsx` :
`sheetBackgroundStyle`, `SheetField`, `SheetActions`, et **`ConfirmDialog` pour toute
confirmation — jamais `Alert.alert`** (natif, visuellement décalé du reste de l'app). Dans une
feuille plein écran, le dialogue doit être rendu dans un `PortalHost` propre à la feuille,
sinon il s'affiche dessous (voir `SHEET_PORTAL` dans `src/components/post-detail-sheet.tsx`).

🚫 **Ne jamais lancer `react-native-reusables init`** : cette commande crée un nouveau
projet (actuellement figé sur le SDK 56) et écraserait la configuration.

### TypeScript

- `strict` est activé — ne pas le contourner avec `any` ou `@ts-ignore`
- Les types de la base viennent de Drizzle : `typeof posts.$inferSelect`, pas de type écrit à la main
- Les types de formulaire viennent de Zod : `z.infer<typeof schema>`

---

## 4. Workflow git

### Branches

Le travail ne se fait **pas** directement sur `master`.

```bash
git checkout -b feat/save-screen
```

| Préfixe | Usage |
|---|---|
| `feat/` | Nouvelle fonctionnalité |
| `fix/` | Correction de bug |
| `chore/` | Outillage, configuration, dépendances |
| `docs/` | Documentation seule |
| `refactor/` | Restructuration sans changement de comportement |

Une fois validée sur appareil, la branche est fusionnée dans `master` en **fast-forward**
(pas de commit de merge), comme `feat/redesign` pour la 0.2.0.

### Messages de commit

Format [Conventional Commits](https://www.conventionalcommits.org/), **en anglais**, sans
scope :

```
<type>: <résumé à l'impératif, en minuscule>

<corps optionnel : pourquoi, pas quoi>
```

**Le corps sert à expliquer le _pourquoi_**, surtout pour une décision non évidente. Un bon
exemple tiré de l'historique du projet :

```
fix: switch SQLite driver from op-sqlite to expo-sqlite

drizzle-orm/op-sqlite has no useLiveQuery — open feature request since
2024-09-08, still unresolved (drizzle-team/drizzle-orm#2926).
...
```

Quelqu'un qui lit ce commit dans six mois comprend la contrainte, pas seulement le diff.

### Avant de proposer une modification

- [ ] `npx expo-doctor` → 21/21
- [ ] Tests unitaires verts (§5) si une logique pure a été touchée
- [ ] L'app se lance et l'écran modifié fonctionne **sur un appareil réel**
- [ ] Aucune couleur en dur (vérifier en mode clair **et** sombre)
- [ ] Aucune donnée persistante stockée ailleurs que dans SQLite
- [ ] Les requêtes de lecture filtrent `WHERE deleted_at IS NULL`
- [ ] [CHANGELOG.md](./CHANGELOG.md) mis à jour si le changement est visible par l'utilisateur
- [ ] [TODO.md](./TODO.md) mis à jour si vous avez terminé ou découvert une tâche

---

## 5. Tester ses changements

### Tests unitaires

La logique pure (analyse d'URL, filtres et recherche, aperçus de dossiers, format de date,
taille des tuiles…) est testée avec le **test runner natif de Node** (`node:test`, zéro
dépendance), dans des fichiers `*.test.ts` placés à côté du module testé :

```bash
npm test
```

> Le script liste explicitement les dossiers de tests (`src/lib/`, `src/lib/sync/`,
> `src/screens/collections/`) : Node 22, épinglé dans `.nvmrc`, ne découvre pas seul les
> fichiers `.ts`. Un test dans un nouveau dossier → ajouter ce dossier au script.

Une logique nouvelle qui ne dépend ni de React ni d'un module natif va dans `src/lib/` (ou à
côté de son écran) **avec son test**.

### Sur appareil réel

Le reste (écrans, base, partage) se valide sur appareil réel.

**Cas à ne pas oublier de tester manuellement :**

| Fonctionnalité touchée | À vérifier |
|---|---|
| N'importe quel écran | Mode clair **et** mode sombre |
| Réception d'un partage | App fermée **et** app déjà ouverte en arrière-plan (deux chemins de code distincts, cf. ARCHITECTURE.md §7) |
| Écriture en base | Que l'affichage se met bien à jour tout seul (`useLiveQuery`) |
| Suppression | Que l'élément disparaît **et** ne réapparaît pas au redémarrage |

---

## 6. Quand faut-il reconstruire l'app ?

Réponse courte : **seulement quand la couche native change**.

- Modifier du `.ts`/`.tsx`, du style, une requête → **rien à faire**, Fast Refresh suffit
- Installer un paquet natif, modifier `app.json` (plugins, permissions) → **rebuild nécessaire**

Le tableau complet est dans [DEVELOPMENT.md](./DEVELOPMENT.md) §4. En cas de doute : si l'app
plante au démarrage avec « native module not found » juste après un `npm install`, il faut
reconstruire.

---

## 7. Ajouter une dépendance

```bash
npx expo install <paquet>     # 1. TOUJOURS essayer ça en premier
npm install <paquet>          # 2. seulement si le paquet est hors registre Expo
npx expo-doctor               # 3. systématiquement après
```

`expo install` choisit automatiquement la version compatible avec le SDK 57. `npm install`
prend la dernière version publiée et casse l'alignement — c'est une erreur qui a déjà coûté
du temps sur ce projet.

Vérifier aussi que l'ajout n'a pas fait dériver une **version épinglée**
(voir [ARCHITECTURE.md](./ARCHITECTURE.md) §8) :

```bash
npm list nativewind tailwindcss expo --depth=0
```

---

## 8. Choses à ne jamais faire

| Interdit | Conséquence |
|---|---|
| `npm audit fix --force` | Casse les versions alignées par `expo install`. Les alertes `npm audit` sur ce projet sont attendues et ignorées |
| `react-native-reusables init` | Recrée un projet en SDK 56, écrase la configuration |
| Passer NativeWind en v5 / Tailwind en v4 | Casse React Native Reusables |
| Stocker des données métier dans Zustand | Deux sources de vérité qui divergent |
| Faire un vrai `DELETE` en base | La suppression ne se propagera jamais en V1.5 |
| Contourner une erreur de module natif avec un correctif maison | Masque un vrai problème de compatibilité au lieu de l'identifier |
