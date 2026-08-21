# Process de développement — PostKeep

> Guide destiné à quelqu'un qui débute en React Native / Expo.
> Il décrit **comment travailler au quotidien** sur ce projet : lancer, tester, ajouter du code,
> ajouter une dépendance, et savoir quand il faut reconstruire l'application.

**Les autres documents du projet :**

| Fichier | Contenu |
|---|---|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Les décisions techniques et leurs raisons — **à lire avant de coder** |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | Conventions de code, workflow git, checklist de relecture |
| [ROADMAP.md](./ROADMAP.md) | Les phases de développement et leur ordre |
| [TODO.md](./TODO.md) | Ce qu'il y a à faire maintenant |
| [CHANGELOG.md](./CHANGELOG.md) | Historique des changements |
| [INIT.md](./INIT.md) | Archive de l'initialisation — historique, pas une référence courante |

---

## 1. Le concept central : deux couches, deux vitesses

C'est **la** chose à comprendre avant tout le reste. Une app React Native contient deux types de code :

| Couche | Contenu | Vitesse de mise à jour |
|---|---|---|
| **JavaScript / TypeScript** | Tes écrans, composants, styles NativeWind, state Zustand, requêtes Drizzle | **Instantané** (Fast Refresh) |
| **Natif** (Java/Kotlin, C++) | Le code compilé des modules natifs : `expo-sqlite`, `expo-share-intent`, `reanimated`… | **Nécessite une recompilation** (~10-20 min) |

L'app installée sur ton téléphone (le **dev client**) est un conteneur natif compilé une fois.
Il va chercher le JavaScript à distance, sur le serveur **Metro** qui tourne sur ton PC.

**Analogie web :**

| Web | PostKeep |
|---|---|
| `npm run dev` (Vite + HMR) | `npx expo start --dev-client` |
| Le navigateur | Le dev client installé sur ton téléphone |
| Recharger la page | Fast Refresh (automatique) |
| Rebuild d'une image Docker | `eas build` (rare, seulement si le natif change) |
| `npm run build` | `eas build --profile production` |

**Conséquence pratique :** tant que tu ne touches qu'à du `.ts` / `.tsx`, tu ne réinstalles
**jamais** l'app. Tu codes, tu sauvegardes, l'écran se met à jour tout seul.

---

## 2. Prérequis (une seule fois)

1. **Node.js 22.13.x** (version attendue par le SDK 57).
2. **Un téléphone Android** avec le dev client installé.
   S'il n'est pas installé, voir §7 « Construire un dev client ».
3. **Le téléphone et le PC sur le même réseau Wi-Fi.** Obligatoire : le téléphone doit pouvoir
   joindre Metro sur ton PC.
4. Les dépendances du projet :
   ```bash
   npm install
   ```

> ⚠️ **Expo Go ne fonctionnera jamais sur ce projet.** Expo Go est un dev client générique qui
> ne contient que les modules du SDK Expo standard. PostKeep utilise `expo-share-intent`,
> qui n'y est pas (même si `expo-sqlite` lui, en fait partie). C'est pour ça qu'on a notre
> propre dev client.

---

## 3. La boucle quotidienne (99 % du temps)

```bash
npx expo start --dev-client
```

Puis sur le téléphone : ouvrir l'app **postkeep**, et se connecter au serveur.

- Si le serveur apparaît automatiquement dans la liste → le sélectionner.
- Sinon → « Enter URL manually » et taper `exp://<IP_DU_PC>:8081`.
  Trouver l'IP du PC avec :
  ```bash
  hostname -I
  ```

À partir de là :

| Action | Résultat |
|---|---|
| Modifier un `.tsx` et sauvegarder | L'écran se recharge tout seul (**Fast Refresh**) |
| Appuyer sur `r` dans le terminal | Recharge complète du bundle |
| Appuyer sur `m` dans le terminal | Ouvre le menu développeur sur le téléphone |
| Secouer le téléphone | Ouvre aussi le menu développeur |
| `Ctrl+C` dans le terminal | Arrête Metro |

Les erreurs JavaScript s'affichent en rouge sur le téléphone **et** dans le terminal.
Les `console.log()` apparaissent dans le terminal où tourne Metro.

### Tester la réception d'un partage

C'est la fonctionnalité d'entrée du produit — et elle a **deux chemins de code différents**
qu'il faut tester séparément (cf. [ARCHITECTURE.md](./ARCHITECTURE.md) §7).

**Cas 1 — app déjà ouverte** (le plus courant en développement) :

1. Ouvrir postkeep, se connecter à Metro, attendre l'écran d'accueil
2. Basculer vers une autre app (Chrome, Notes…) — **sans fermer postkeep**
3. Sélectionner du texte ou une URL → Partager → PostKeep
4. → L'app revient au premier plan et navigue vers l'écran de partage

**Cas 2 — app fermée (démarrage à froid)** :

1. Fermer postkeep (balayage dans les applications récentes)
2. Partager depuis une autre app
3. → L'app démarre. **En développement, elle affichera l'écran de connexion au serveur**
   avant de pouvoir charger le JavaScript : c'est normal, le dev client doit d'abord
   joindre Metro. Ce n'est pas un bug — en production, le JS est embarqué et l'écran de
   partage s'ouvre directement.

> 🐛 **Piège vécu** : un partage reçu alors que l'app tournait déjà ne déclenchait rien.
> `+native-intent.tsx` ne couvre que le démarrage à froid. Il faut **aussi** un
> `ShareIntentProvider` monté à la racine. Si vous touchez à cette partie, testez les deux cas.

---

## 4. Quand faut-il reconstruire l'app ? (la question qui revient tout le temps)

**Réponse courte : uniquement quand la couche native change.**

### ❌ PAS besoin de reconstruire

- Créer / modifier / supprimer un écran ou un composant
- Changer des classes NativeWind, `global.css`, `tailwind.config.js`
- Ajouter un store Zustand, un schéma Zod, un formulaire
- Écrire des requêtes Drizzle, modifier le schéma SQL
- Ajouter une librairie **100 % JavaScript** (ex. `date-fns`, `zod`, `clsx`)
- Ajouter un composant React Native Reusables (`rnr add card`)

→ Dans tous ces cas : sauvegarde, et c'est déjà à jour sur le téléphone.

### ✅ Besoin de reconstruire (`eas build`)

- Installer un paquet contenant du **code natif** (règle simple : s'il s'installe avec
  `npx expo install` et qu'il touche au système, c'est probablement natif)
- Modifier la section `plugins` de `app.json`
- Ajouter une permission Android
- Changer `android.package`, l'icône, le splash screen
- Upgrader le SDK Expo

> 💡 **Bonne pratique senior :** grouper les changements natifs. Si tu sais que tu vas ajouter
> trois modules natifs, installe-les **tous d'abord**, puis fais **un seul** build — au lieu de
> payer 3 × 15 minutes de compilation.

### ⚠️ État actuel : un rebuild est en attente

`expo-sqlite` a été ajouté au projet **après** la construction du dev client actuellement
installé. Le module natif n'est donc **pas** dans l'app sur le téléphone.

Ça ne pose aucun problème tant que **rien n'importe `expo-sqlite`** — du code jamais exécuté
ne peut pas planter. Mais dès la première ligne de code qui ouvre la base
(début de la Phase 1, cf. [ROADMAP.md](./ROADMAP.md)), il faudra reconstruire une fois :

```bash
npx eas-cli build --profile development --platform android
```

Après ce rebuild, retour au Fast Refresh normal — modifier le schéma ou écrire des requêtes
ne demandera **pas** de nouveau build.

Symptôme si on oublie : l'app plante au lancement avec une erreur du type
*« native module not found »*.

---

## 5. Ajouter une dépendance — l'arbre de décision

**Toujours essayer `npx expo install` en premier.** Cette commande choisit automatiquement la
version compatible avec le SDK 57, contrairement à `npm install` qui prend la dernière version
publiée (et casse l'alignement).

```bash
# 1. Toujours commencer par ça
npx expo install <paquet>
```

Si le paquet n'est pas dans le registre Expo, `expo install` le dira, et **là seulement** :

```bash
# 2. Uniquement si le paquet est hors registre Expo
npm install <paquet>
```

Puis **systématiquement**, pour vérifier que rien n'a dérivé :

```bash
npx expo-doctor
```

### Versions épinglées — ne pas y toucher

Certaines versions sont volontairement figées. Les changer casse le projet :

| Paquet | Version | Pourquoi |
|---|---|---|
| `nativewind` | 4.2.6 | La v5 supprime `tailwind.config.js` → casse React Native Reusables |
| `tailwindcss` | 3.4.19 | La v4 est une config CSS-first → même problème |

> La doc officielle d'Expo recommande NativeWind v5 pour le SDK 57. **Ne pas la suivre ici.**
> Voir « Piège 2 » dans `INIT.md`.

---

## 6. Ajouter un composant d'interface

Les composants UI viennent de **React Native Reusables** (l'équivalent de shadcn/ui pour mobile) :
le CLI **copie le code source** dans `src/components/ui/`. Ce sont ensuite *tes* fichiers, tu peux
les modifier librement.

```bash
npx @react-native-reusables/cli@latest add <composant> --yes
```

Exemples : `add card`, `add input`, `add dialog`. Liste complète : https://reactnativereusables.com

Puis vérifier :

```bash
npx @react-native-reusables/cli doctor --yes
```

> ⚠️ **Ne JAMAIS lancer `react-native-reusables init`.** Cette commande crée un **nouveau projet**
> avec son propre template, actuellement figé sur le **SDK 56** — elle écraserait la configuration
> du projet. On utilise uniquement `add` et `doctor`.

> 💡 Le flag `--yes` est nécessaire : sans lui, le CLI pose des questions interactives et se bloque.

---

## 7. Construire un dev client (rare)

Nécessaire seulement dans les cas du §4, ou pour installer l'app sur un nouveau téléphone.

```bash
npx eas-cli build --profile development --platform android
```

Le build se fait **dans le cloud** (pas besoin d'Android Studio ni d'une machine puissante).
À la fin, un QR code et un lien s'affichent : ouvrir le lien **sur le téléphone** pour installer l'APK.

> Le plan EAS gratuit a un quota mensuel de builds. Une fois atteint, les builds sont **bloqués
> jusqu'au renouvellement** — jamais facturés automatiquement. Raison de plus pour grouper les
> changements natifs.

### Les trois profils (`eas.json`)

| Profil | Commande | Usage |
|---|---|---|
| `development` | `--profile development` | Dev client : se connecte à Metro, Fast Refresh. **Celui du quotidien.** |
| `preview` | `--profile preview` | APK autonome, sans Metro. Pour faire tester à quelqu'un. |
| `production` | `--profile production` | Version finale à distribuer (GitHub Release). |

---

## 8. Vérifier que le projet est sain

Trois commandes à connaître. À lancer après toute installation, et avant tout commit important.

```bash
npx expo-doctor              # 21 vérifications : versions, peer deps, config native
npx expo install --check     # les versions correspondent-elles au SDK 57 ?
npx @react-native-reusables/cli doctor --yes   # config NativeWind + RNR complète ?
```

**Objectif : `21/21 checks passed` et `All checks passed`.**

Si `expo-doctor` signale un décalage de versions :

```bash
npx expo install --fix
```

C'est normal et sans danger : Expo publie des versions patch régulièrement.

---

## 9. Règles strictes — ne jamais faire

| Interdit | Pourquoi |
|---|---|
| `npm audit fix --force` | Casse les versions alignées par `expo install`. Les alertes `npm audit` sur ce projet sont attendues, on les ignore. |
| `react-native-reusables init` | Recrée un projet en SDK 56, écrase la config. |
| `npm install` pour un paquet du registre Expo | Installe une version incompatible avec le SDK. Toujours `expo install` d'abord. |
| Passer NativeWind en v5 / Tailwind en v4 | Casse React Native Reusables. |
| Stocker des données métier dans Zustand | Zustand = **état UI uniquement** (filtre actif, modale ouverte). Les données vivent dans SQLite. |
| Contourner une erreur de module natif avec un patch maison | Un module incompatible doit être **identifié et signalé**, pas masqué. |

---

## 10. Carte du projet

```
postkeep/
├── src/
│   ├── app/                    # Routes UNIQUEMENT — expo-router : 1 fichier = 1 route
│   │   ├── _layout.tsx         #   Layout racine : providers globaux + Stack
│   │   ├── +native-intent.tsx  #   Redirection des partages entrants (app fermée)
│   │   ├── shareintent.tsx     #   Écran de réception d'un partage (modale)
│   │   └── (tabs)/             #   Groupe d'onglets
│   │       ├── _layout.tsx
│   │       ├── index.tsx       #     Accueil ("/")
│   │       └── explore.tsx     #     (démo du template, à supprimer)
│   ├── screens/                # Corps des écrans complexes (à créer, voir CONTRIBUTING §3)
│   ├── components/
│   │   └── ui/                 # Composants React Native Reusables (copiés, modifiables)
│   ├── db/
│   │   ├── schema.ts           #   Schéma Drizzle (vide pour l'instant)
│   │   └── migrations/         #   Migrations générées par drizzle-kit
│   ├── lib/
│   │   ├── utils.ts            #   cn() — fusion de classes Tailwind
│   │   └── theme.ts            #   THEME + NAV_THEME (couleurs en TS)
│   ├── constants/theme.ts      # Thème du template Expo d'origine (à fusionner/supprimer)
│   └── hooks/
├── global.css                  # Directives Tailwind + variables CSS du thème
├── tailwind.config.js          # Mapping couleurs → variables CSS. content: ./src/**
├── metro.config.js             # Bundler + NativeWind (inlineRem: 16) + .sql (Drizzle)
├── babel.config.js             # Preset Expo + NativeWind + inline-import (.sql)
├── drizzle.config.ts           # Configuration drizzle-kit (dialect sqlite, driver expo)
├── app.json                    # Config de l'app : nom, package, plugins, permissions
├── eas.json                    # Profils de build cloud
└── components.json             # Config du CLI React Native Reusables
```

### Routing : expo-router

Le routing est **basé sur les fichiers**, comme Next.js :

| Fichier | Route |
|---|---|
| `src/app/(tabs)/index.tsx` | `/` |
| `src/app/settings.tsx` | `/settings` |
| `src/app/post/[id].tsx` | `/post/123` (paramètre dynamique) |
| `src/app/_layout.tsx` | Layout partagé (ne crée pas de route) |
| `src/app/(tabs)/` | Groupe — les parenthèses **n'apparaissent pas** dans l'URL |

Créer un fichier dans `src/app/` suffit à créer la route — aucune config à modifier.

⚠️ **`src/app/` ne doit contenir que des routes.** Un écran qui grossit va dans
`src/screens/`, la route se contentant de le rendre. Voir
[CONTRIBUTING.md](./CONTRIBUTING.md) §3.

---

## 11. Règles de code spécifiques au projet

Les règles complètes et leurs justifications sont dans
[ARCHITECTURE.md](./ARCHITECTURE.md) — **source de vérité**, ne pas dupliquer ici.
Le rappel minimal pour le travail quotidien :

- **Données persistantes → SQLite** (Drizzle). Jamais dans Zustand, jamais dans un `useState`.
  Zustand ne sert qu'à l'état d'interface (filtre actif, modale ouverte).
- **Ouvrir la base avec `enableChangeListener: true`**, sinon `useLiveQuery` ne réagit à rien.
- **5 colonnes obligatoires** sur toute table : `id` (TEXT, UUID client), `created_at`,
  `updated_at`, `deleted_at`, `user_id` → [détail et raisons](./ARCHITECTURE.md#4-schéma-de-données--5-colonnes-obligatoires).
- **Jamais de vrai `DELETE`** — mettre `deleted_at` à jour, et filtrer
  `WHERE deleted_at IS NULL` dans **toutes** les lectures.
- **Couleurs du thème uniquement** (`bg-background`, `text-foreground`…), jamais de couleur
  en dur : sinon le mode sombre casse.

---

## 12. Dépannage

| Symptôme | Cause probable | Solution |
|---|---|---|
| Le dev client ne trouve pas le serveur | Téléphone et PC sur des réseaux différents | Même Wi-Fi, ou saisir `exp://<IP>:8081` manuellement |
| `Unable to resolve module ...` | Paquet installé pendant que Metro tournait | `Ctrl+C` puis `npx expo start --dev-client --clear` |
| Les classes Tailwind ne s'appliquent pas | Cache Metro | `npx expo start --clear` |
| L'app crash au démarrage après un `npm install` | Module natif ajouté sans rebuild | Refaire un `eas build --profile development` |
| Écran rouge « native module not found » | Idem — le natif manque dans le dev client | Idem |
| `expo-doctor` signale des versions décalées | Nouvelles versions patch publiées | `npx expo install --fix` |
| Le CLI RNR reste bloqué sans rien afficher | Il attend une réponse interactive | Relancer avec `--yes` |
| Texte invisible (noir sur noir en mode sombre) | `Text` de `react-native` au lieu de celui de RNR | Importer `Text` depuis `@/components/ui/text` |
| Un partage n'ouvre pas l'écran attendu | Un seul des deux chemins de réception est câblé | Vérifier `+native-intent.tsx` **et** `ShareIntentProvider` racine (ARCHITECTURE §7) |
| `useLiveQuery` ne se met jamais à jour | Base ouverte sans `enableChangeListener: true` | Corriger l'ouverture de la base dans `src/db/` |
| Des éléments supprimés réapparaissent | Requête sans filtre sur la suppression logique | Ajouter `WHERE deleted_at IS NULL` |
| Micro-saccade au lancement | Deux animations du template qui s'enchaînent | Comportement connu, disparaîtra au nettoyage du template ([TODO.md](./TODO.md)) |

---

## 13. Résumé — la journée type

```bash
# 1. Démarrer (une fois le matin)
npx expo start --dev-client

# 2. Coder. Sauvegarder. Regarder le téléphone. Répéter.
#    → Fast Refresh, aucune commande à relancer.

# 3. Après avoir installé quoi que ce soit
npx expo-doctor

# 4. Uniquement si le natif a changé
npx eas-cli build --profile development --platform android
```

**Le reste du temps, tu ne touches ni à EAS, ni à un build, ni à ton téléphone.**
