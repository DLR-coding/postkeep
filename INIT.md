# Initialisation du projet — Spec pour Claude Code

> ## 📦 Document historique — archivé
>
> **L'initialisation décrite ici est terminée** (21 août 2026). Ce document est conservé
> comme trace du raisonnement et des pièges rencontrés, **pas comme référence courante**.
>
> Pour travailler sur le projet aujourd'hui :
>
> | Besoin | Document |
> |---|---|
> | Les décisions d'architecture en vigueur | [ARCHITECTURE.md](./ARCHITECTURE.md) |
> | Lancer et développer au quotidien | [DEVELOPMENT.md](./DEVELOPMENT.md) |
> | Conventions et workflow git | [CONTRIBUTING.md](./CONTRIBUTING.md) |
> | Ce qu'il reste à faire | [ROADMAP.md](./ROADMAP.md) · [TODO.md](./TODO.md) |
>
> ⚠️ **En cas de contradiction, `ARCHITECTURE.md` fait foi.** Certaines décisions de ce
> document ont été corrigées après vérification — notamment le choix du driver SQLite
> (§5), revenu de `op-sqlite` à `expo-sqlite`.
>
> Les écarts constatés pendant l'exécution (dépendances manquantes non listées ici,
> procédure de build remplacée par EAS Build, étape de validation `bottom-sheet` ajoutée)
> sont consignés dans [CHANGELOG.md](./CHANGELOG.md).

---

> **À lire en entier avant d'exécuter quoi que ce soit.**
> Ce document décrit l'initialisation complète d'une app mobile Expo/React Native.
> Une première tentative a échoué sur 4 points précis, documentés en section « Pièges ».
> **Utiliser Context7 pour vérifier chaque doc officielle avant d'écrire un fichier de config.**

---

## 1. Contexte produit

App mobile **Android-only** (iOS plus tard) qui centralise les posts enregistrés depuis les
réseaux sociaux (Instagram, TikTok, X, Threads…), avec prise de notes et organisation.

**Architecture : local-first.**
- La base SQLite locale est la **source de vérité**
- L'app fonctionne hors ligne et sans compte
- La synchronisation serveur arrive en V1.5, en surcouche

**Entrée des données :** le share sheet Android. L'utilisateur partage un post depuis
Instagram/TikTok → l'app s'ouvre → il ajoute collection + note → retour.

**Contrainte forte :** coût zéro. Pas de backend en V1.

---

## 2. Stack validée

### Socle
| Paquet | Version | Note |
|---|---|---|
| `expo` | SDK 57 | Validé : `expo-doctor` 21/21 |
| `react-native` | 0.86 | Embarqué par SDK 57 |
| `typescript` | — | |
| `expo-router` | — | Navigation par fichiers |

### Styling & UI
| Paquet | Version | Note |
|---|---|---|
| `nativewind` | **4.2.6** | ⚠️ **v4 impérativement, PAS v5** |
| `tailwindcss` | **3.4.19** | ⚠️ **v3 impérativement, PAS v4** |
| `clsx` + `tailwind-merge` | — | Helper `cn()` |
| React Native Reusables | CLI | `@react-native-reusables/cli` |
| `@rn-primitives/portal` | — | Dépendance RNR (PortalHost) |
| `lucide-react-native` | — | Icônes |

### Réception & ouverture des posts
| Paquet | Note |
|---|---|
| `expo-share-intent` | ⚠️ **Hors registre Expo** — compatibilité SDK 57 à vérifier manuellement |
| `expo-linking` | Deep link vers l'app d'origine |

### Données locales (source de vérité)
| Paquet | Note |
|---|---|
| `expo-sqlite` | Base SQLite — voir §5, corrigé post-init : `@op-engineering/op-sqlite` initialement choisi, revenu sur `expo-sqlite` |
| `drizzle-orm` | Requêtes typées |
| `drizzle-kit` | Migrations (devDependency) |
| `useLiveQuery` | Réactivité UI, natif Drizzle — **pas de TanStack Query en V1** |

### État & formulaires
| Paquet | Note |
|---|---|
| `zustand` | État UI **uniquement** — jamais les données |
| `react-hook-form` | Écran de sauvegarde |
| `zod` | Validation + types dérivés |

### Composants d'interaction
| Paquet | Note |
|---|---|
| `@gorhom/bottom-sheet` | Écran de sauvegarde |
| `@shopify/flash-list` | Liste des posts — **pas `FlatList`** |
| `react-native-reanimated` | Animations |
| `react-native-worklets` | Dépendance Reanimated |
| `react-native-gesture-handler` | Gestes, swipe |
| `react-native-keyboard-controller` | Clavier sur formulaire |

### Confort & finition
| Paquet | Note |
|---|---|
| `react-native-safe-area-context` | Zones sûres |
| `expo-image` | Cache d'images |
| `expo-haptics` | Retour tactile |
| `expo-notifications` | Rappels locaux |
| `react-native-toast-message` | Feedback d'action |

---

## 3. Pièges identifiés lors de la première tentative

**À intégrer impérativement dans la procédure.**

### Piège 1 — `expo install` vs `npm install`
`@shopify/flash-list` et `react-native-keyboard-controller` **sont dans le registre Expo**.
Les installer avec `npm install` a produit un désalignement de versions
(2.3.2 au lieu de 2.0.2 ; 1.22.4 au lieu de 1.21.9).

→ **Règle : toujours tenter `npx expo install` en premier.** Ne basculer sur `npm install`
que pour les paquets réellement hors registre.

### Piège 2 — NativeWind v5 est incompatible avec RNR
La doc Expo pousse NativeWind v5 + Tailwind v4 sur SDK 57. **Ne pas suivre cette voie.**

- NativeWind v5 / Tailwind v4 supprime `tailwind.config.js` (config CSS-first)
- Le CLI RNR **exige** un `tailwind.config.js` → échec immédiat
- NativeWind v5 est en `@preview`, avec `react-native-css` en version nightly

→ **Épingler `nativewind@4.2.6` et `tailwindcss@3.4.19`.**

### Piège 3 — Structure `src/`
Le CLI RNR écrit dans `src/components/ui/`. La config Tailwind doit donc pointer
vers `./src/**/*.{js,jsx,ts,tsx}` et non `./app/**` + `./components/**`.

→ **Vérifier la structure réelle générée avant d'écrire `tailwind.config.js`.**

### Piège 4 — RNR exige une config enrichie
Après `add button`, `npx @react-native-reusables/cli doctor` a signalé 5 problèmes :
- Helper `cn()` manquant (`src/lib/utils.ts`)
- `inlineRem: 16` manquant dans `metro.config.js`
- `PortalHost` manquant dans le layout racine
- Variables CSS de thème manquantes dans `global.css`
- Mapping des couleurs manquant dans `tailwind.config.js`

→ **Faire toute la config RNR AVANT d'ajouter le premier composant.**

### Piège 5 (potentiel) — bug du registre RNR
Des issues de décembre 2025 (#490, #495) rapportent des erreurs
`Checking registry. Something went wrong` avec des URLs malformées.
→ Si ça survient : copier manuellement le code des composants depuis
`reactnativereusables.com` dans `src/components/ui/`. Le CLI n'est qu'un confort,
le modèle est de toute façon du copier-coller.

---

## 4. Procédure d'initialisation

### Étape 0 — Nettoyage
Supprimer toute tentative précédente. Repartir d'un dossier vide.

### Étape 1 — Création du projet
```bash
npx create-expo-app <NOM_DU_PROJET>
cd <NOM_DU_PROJET>
```
→ Choisir **SDK 57 (Latest)** si la question est posée.
→ **Noter la structure générée** (`app/` à la racine ou `src/app/` ?) — conditionne l'étape 5.

### Étape 2 — Vérification du socle
```bash
npx expo-doctor
```
Doit passer avant de continuer.

### Étape 3 — Dépendances du registre Expo
```bash
npx expo install expo-router expo-linking expo-image expo-haptics expo-notifications \
  react-native-safe-area-context react-native-reanimated react-native-gesture-handler \
  @shopify/flash-list react-native-keyboard-controller
```

```bash
npx expo-doctor
npx expo install --check
```
→ Si des mismatches apparaissent : `npx expo install --fix`

### Étape 4 — Dépendances hors registre
```bash
# NativeWind v4 — versions épinglées, ne pas prendre latest
npm install nativewind@4.2.6 tailwindcss@3.4.19
npm install clsx tailwind-merge

# Données
npm install @op-engineering/op-sqlite drizzle-orm
npm install -D drizzle-kit

# État & formulaires
npm install zustand react-hook-form zod

# UI
npm install @gorhom/bottom-sheet lucide-react-native react-native-toast-message

# Share sheet
npm install expo-share-intent
```

```bash
npx expo-doctor
```

**Vérification manuelle requise** (Context7 + GitHub issues) :
- `expo-share-intent` → compatibilité SDK 57 / React Native 0.86 ?
- `@op-engineering/op-sqlite` → compatibilité SDK 57 ?

### Étape 5 — Configuration NativeWind v4

> **Vérifier la doc officielle NativeWind v4 via Context7 avant d'écrire ces fichiers.**
> Adapter les chemins à la structure réelle du projet (`src/` ou racine).

**`tailwind.config.js`** — chemins `content` à adapter à la structure réelle :
```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: { extend: {} },
  plugins: [],
};
```

**`global.css`** :
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

**`babel.config.js`** :
```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
  };
};
```

**`metro.config.js`** :
```bash
npx expo customize metro.config.js
```
```js
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, {
  input: "./global.css",   // adapter le chemin
  inlineRem: 16,           // REQUIS par RNR
});
```

**`nativewind-env.d.ts`** :
```ts
/// <reference types="nativewind/types" />
```

**Import dans le layout racine** (`_layout.tsx`, en première ligne) :
```tsx
import "../global.css";   // adapter le chemin
```

### Étape 6 — Configuration React Native Reusables

> **Récupérer les blocs officiels sur `reactnativereusables.com/docs/installation/manual`
> (section « Configure your styles ») via Context7.**
> Ne PAS inventer les valeurs de variables CSS.

**a) Helper `cn()`** → `src/lib/utils.ts` :
```ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

**b) Variables CSS de thème** → à ajouter dans `global.css`
(`--background`, `--foreground`, `--primary`, `--muted`, `--border`… en `:root` et `.dark`)

**c) Mapping des couleurs** → à ajouter dans `theme.extend.colors` de `tailwind.config.js`

**d) PortalHost** → dans le layout racine, après le `<Stack />` :
```tsx
import { PortalHost } from '@rn-primitives/portal';
// ...
<PortalHost />
```

**e) Vérification** :
```bash
npx @react-native-reusables/cli doctor
```
→ **Doit afficher 0 problème avant de continuer.**

### Étape 7 — Premier composant
```bash
npx @react-native-reusables/cli@latest add button
npx @react-native-reusables/cli doctor
```

### Étape 8 — Build natif (le vrai test)
```bash
npx expo prebuild --clean
npx expo run:android
```

Prérequis : téléphone Android en USB avec débogage activé, ou émulateur lancé.

> ⚠️ **`expo-share-intent` est un module natif → Expo Go ne fonctionnera jamais.**
> Le dev build est obligatoire dès le départ.

### Étape 9 — Verrouillage
Une fois le build validé, retirer les `^` et `~` dans `package.json` pour :
`expo`, `nativewind`, `tailwindcss`, `expo-share-intent`,
`react-native-reanimated`, `react-native-gesture-handler`
(`expo-sqlite`, package du registre Expo comme `expo-image`/`expo-haptics`, n'a pas besoin
d'un verrouillage exact — contrairement à `@op-engineering/op-sqlite` initialement prévu ici,
hors registre. Voir §5, correction post-init.)

```bash
git init
git add .
git commit -m "chore: init — stack validated on SDK 57, versions locked"
```

---

## 5. Décisions d'architecture à respecter

### expo-sqlite, pas op-sqlite (corrigé post-init)

**Décision initiale (fausse)** : PowerSync ne fonctionnerait pas avec `expo-sqlite`, donc
partir directement sur `op-sqlite` éliminerait une migration future.

**Correction** — deux erreurs vérifiées après coup :

1. `drizzle-orm/op-sqlite` n'a **pas** de `useLiveQuery`. Feature request ouverte chez
   Drizzle depuis le 8 sept. 2024, toujours non résolue :
   [drizzle-orm#2926](https://github.com/drizzle-team/drizzle-orm/issues/2926).
   La doc officielle op-sqlite ne documente que `useMigrations`, jamais `useLiveQuery`.
2. La prémisse elle-même était fausse : PowerSync **n'utilise pas** la connexion op-sqlite
   de l'app — il instancie sa propre base (`PowerSyncDatabase` + `OPSqliteOpenFactory` ou
   équivalent), quel que soit le driver de départ. Le bénéfice "zéro migration" en V1.5
   n'existe pas : l'instanciation de la base est de toute façon remplacée à la transition.
   Ce qui survit, c'est le **schéma Drizzle**, identique avec `expo-sqlite` ou `op-sqlite`.

→ **`expo-sqlite` retenu** : `useLiveQuery` y est documenté et standard, c'est le chemin
le plus emprunté de la doc Drizzle/Expo, et il n'y a aucune perte côté V1.5.

### Pas de TanStack Query en V1
Drizzle fournit `useLiveQuery` (driver `expo-sqlite`), qui observe les changements SQLite
et re-render automatiquement. TanStack Query ferait doublon.

⚠️ **Requiert `enableChangeListener: true`** à l'ouverture de la base
(`SQLite.openDatabaseSync('db.db', { enableChangeListener: true })`), sinon
`useLiveQuery` ne réagit à rien.

→ TanStack Query reviendra en V1.5 via `@powersync/react-query`, pour l'état réseau.

### Zustand ≠ stockage
Zustand gère **uniquement** l'état UI (filtre actif, collection sélectionnée,
modale ouverte). Les données vivent en SQLite. Ne jamais dupliquer les
enregistrements dans un store Zustand.

### Pas de WebView, pas de fetch de métadonnées en V1
- Tap sur un post → `Linking.openURL()` → l'OS ouvre Instagram/TikTok
- Preview = logo de plateforme détecté depuis l'URL
- Le fetch Open Graph est en backlog, pas en V1

---

## 6. Schéma de données — règles non négociables

Le schéma doit être compatible sync **dès la V1**, même si la sync arrive en V1.5.
Une migration de schéma sur des appareils déjà installés est coûteuse.

**Quatre règles sur chaque table synchronisable :**

| Colonne | Type | Raison |
|---|---|---|
| `id` | `TEXT PRIMARY KEY` | **UUID généré côté client** — jamais d'auto-increment (deux appareils hors ligne créeraient les mêmes ID) |
| `created_at` | `INTEGER` | Requis par les moteurs de sync delta |
| `updated_at` | `INTEGER` | Delta sync — quelles lignes ont changé depuis la dernière synchro |
| `deleted_at` | `INTEGER NULL` | **Soft delete** — un vrai `DELETE` ne se propage jamais entre appareils |
| `user_id` | `TEXT NULL` | Nullable : permet de rattacher a posteriori les enregistrements créés avant l'inscription |

**Ajouter un dossier de migrations Drizzle dès le premier commit**, même vide.

---

## 7. Périmètre V1

**Inclus :**
1. Réception du share sheet (`text/*`)
2. Écran de sauvegarde : parsing d'URL → détection de plateforme → collection + note
3. Liste des posts (FlashList)
4. Recherche locale + filtres par collection/tag
5. Tap → ouverture dans l'app d'origine
6. Boucle de retour : rappels locaux, mode triage

**Exclu volontairement :**
- Compte utilisateur, backend, synchronisation
- WebView, embeds
- Fetch de métadonnées Open Graph
- iOS

---

## 8. V1.5 — pour information (ne pas installer maintenant)

```
Supabase                    Postgres + Auth + RLS
@powersync/react-native     moteur de sync SQLite ↔ Postgres
@powersync/drizzle-driver   conserve la syntaxe Drizzle de la V1
@powersync/react-query      état réseau (sync en cours, erreurs)
GitHub Actions (cron)       ping tous les 3 jours — anti-pause du tier gratuit Supabase
```

Le compte utilisateur sera **optionnel**, jamais un mur d'inscription au lancement.

---

## 9. Instructions pour Claude Code

1. **Vérifier via Context7 avant d'écrire chaque fichier de config** — la doc officielle
   prime sur les extraits de ce document, qui peuvent avoir vieilli.
2. **Ne pas suivre la recommandation Expo de NativeWind v5** — voir Piège 2.
3. **Adapter tous les chemins** à la structure réellement générée par `create-expo-app`.
4. **S'arrêter et signaler** en cas d'erreur plutôt que de contourner avec un patch maison :
   un paquet natif incompatible doit être identifié, pas masqué.
5. **Ne pas exécuter `npm audit fix --force`** — casse les résolutions de versions
   qu'`expo install` a alignées.
6. **Ne pas écrire de code métier** dans cette phase. L'objectif est uniquement
   un projet qui build et se lance sur Android.
