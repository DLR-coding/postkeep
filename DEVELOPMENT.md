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

1. **Node.js 22, 22.13 minimum** (le SDK 58 accepte `^22.13` ; `.nvmrc` → `nvm use`).
2. **Un téléphone Android** avec le dev client installé.
   S'il n'est pas installé, voir §7 « Construire un dev client ».
3. **Un chemin du téléphone vers Metro sur ton PC** : `--tunnel` (marche partout), câble USB
   + `adb reverse`, ou même réseau Wi-Fi si aucun pare-feu ne bloque le port 8081 (voir §3).
4. Les dépendances du projet :
   ```bash
   npm install
   ```
5. **Le fichier `.env.local`** (compte et synchronisation, §9) — ignoré par git :
   ```bash
   cp .env.example .env.local
   # puis y mettre l'URL du projet et la clé publishable : tableau de bord Supabase →
   # Project Settings → API Keys (clé « publishable », sb_publishable_…)
   ```
   Sans lui, l'app lève une erreur dès le démarrage (`EXPO_PUBLIC_SUPABASE_URL /
   EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY manquants`). Les variables `EXPO_PUBLIC_*` sont
   inlinées dans le bundle par Metro : après une modification, relancer Metro avec `--clear`.
   La clé publishable est publique par conception (la RLS protège les données) ; ne jamais
   mettre ici la clé secrète (`sb_secret_…`, ex-`service_role`).

> ⚠️ **Expo Go ne fonctionnera jamais sur ce projet.** Expo Go est un dev client générique qui
> ne contient que les modules du SDK Expo standard. PostKeep utilise `expo-share-intent`,
> qui n'y est pas (même si `expo-sqlite` lui, en fait partie). C'est pour ça qu'on a notre
> propre dev client.

---

## 3. La boucle quotidienne (99 % du temps)

```bash
npx expo start --dev-client --tunnel
```

`--tunnel` est la commande par défaut sous WSL : en réseau `mirrored`, le pare-feu Hyper-V de
WSL bloque le port 8081 en entrée, et le QR code « charge » indéfiniment sans `--tunnel`. Ne
pas lancer Metro avec `CI=1` : le rechargement à chaud est alors désactivé et l'app garde
l'ancien code sans prévenir.

Alternative par câble USB (plus rapide) : `adb reverse tcp:8081 tcp:8081` (avec l'`adb.exe`
de Windows), puis dans l'app « Enter URL manually » → `http://localhost:8081`.

```bash
ADB=/mnt/c/Users/drakotomahefa/AppData/Local/platform-tools/adb.exe
$ADB reverse tcp:8081 tcp:8081
# Ouvrir directement le dev client sur Metro, sans passer par le launcher :
$ADB shell am force-stop com.thejohninc.postkeep   # d'abord — voir le piège ci-dessous
$ADB shell am start -a android.intent.action.VIEW \
  -d 'exp+postkeep://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8081'
```

> 🐛 **Piège vécu** : sans le `force-stop`, le deep link arrive dans un processus encore
> vivant et le dev client plante (« App react context shouldn't be created before… »).

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

**Simuler un partage sans ouvrir Instagram** (même `ADB` qu'au-dessus) :

```bash
$ADB shell am start -a android.intent.action.SEND -t text/plain \
  --es android.intent.extra.TEXT 'https://www.instagram.com/reel/XXXX/' com.thejohninc.postkeep
```

### Mesurer l'interface

Pour vérifier une taille ou un espacement, lire les coordonnées réelles plutôt que d'estimer
à l'œil sur une capture d'écran :

```bash
$ADB shell uiautomator dump /sdcard/ui.xml && $ADB exec-out cat /sdcard/ui.xml
# → chaque élément a ses bounds="[x1,y1][x2,y2]" en pixels physiques
```

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

Symptôme si on oublie : l'app plante au lancement avec une erreur du type
*« native module not found »*.

---

## 5. Ajouter une dépendance — l'arbre de décision

**Toujours essayer `npx expo install` en premier.** Cette commande choisit automatiquement la
version compatible avec le SDK 58, contrairement à `npm install` qui prend la dernière version
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
| `nativewind` | 4.2.7 | La v5 supprime `tailwind.config.js` → casse React Native Reusables |
| `tailwindcss` | 3.4.19 | La v4 est une config CSS-first → même problème |

> La doc officielle d'Expo recommande NativeWind v5 pour le SDK 58. **Ne pas la suivre ici.**
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

## 7. Les builds : lequel pour quoi

### Quel build pour quoi

| Profil (`eas.json`) | Le JavaScript | Autonome ? | Sert à |
|---|---|---|---|
| `development` | **Pas dans l'APK** : servi par Metro depuis le PC | Non — sans Metro, l'app reste sur l'écran du launcher | Développer (Fast Refresh) |
| `production` | Embarqué dans l'APK | Oui | **L'app du quotidien**, et celle publiée en GitHub Release |
| `preview` | Embarqué dans l'APK | Oui | Défini mais inutilisé : `production` produit déjà un APK |

- **Même paquet (`com.thejohninc.postkeep`), même clé de signature EAS** : on peut installer
  l'APK de production par-dessus le dev client, et inversement, **sans perdre les données**
  (la base SQLite reste en place).
- **Expo Go est impossible** : `expo-share-intent` contient du code natif qu'Expo Go n'a pas
  (voir §2).
- **Libellés trompeurs du tableau de bord Expo** : un build `production` y est affiché
  « Android Play Store build », même s'il n'est jamais envoyé au Play Store (c'est seulement
  sa distribution par défaut). Un build `preview` (`distribution: internal`, sans dev client)
  n'apparaît dans aucune des deux cartes de l'Overview — seulement dans Activity / Builds.
- **Les artefacts EAS expirent** (un build de deux mois est marqué « Expired » et n'est plus
  téléchargeable). L'APK à garder est donc celui attaché à la **GitHub Release** (§8).

### Variables d'environnement des builds

`.env.local` n'est pas commité, donc **pas envoyé à EAS**. Les builds lisent
`EXPO_PUBLIC_SUPABASE_URL` et `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` dans les variables
d'environnement EAS, créées (visibilité `plaintext`) pour les trois environnements
`development`, `preview` et `production`. Chaque profil d'`eas.json` désigne le sien
(`"environment": "production"`, etc.).

```bash
npx eas-cli env:list --environment production          # vérifier
npx eas-cli env:set --name EXPO_PUBLIC_SUPABASE_URL --value 'https://<ref>.supabase.co' \
  --environment development --environment preview --environment production \
  --visibility plaintext                                # créer ou modifier
# (env:create, utilisé à la mise en place, est déprécié au profit d'env:set)
```

Une nouvelle variable `EXPO_PUBLIC_*` se crée dans les trois environnements, sinon un
seul profil la verra.

### Dev client en local, sur Windows (sans quota EAS)

> **APK release local** : même script avec `-Release` (clone `C:\dev\pkr`) → APK autonome de
> l'app (`com.thejohninc.postkeep`, JS embarqué, R8), copié en `C:\dev\pkr\postkeep-v<version>.apk`.
> Signé avec la **clé de debug** du gabarit Expo, pas celle d'EAS : désinstaller l'app avant de
> l'installer par-dessus un APK EAS (et inversement) ; un APK `-Release` suivant s'installe
> par-dessus le précédent. `versionCode` fixé à la main dans `app.json` (`android.versionCode`,
> ignoré par EAS en `appVersionSource: remote`). Utilisé pour la v0.5.0-beta.

Le dev client se compile côté **Windows** (15,6 Go de RAM, contre 7,6 Go pour WSL), sans
passer par EAS : `scripts/build-dev-android.ps1`. Il produit la variante **« PostKeep Dev »**
(`com.thejohninc.postkeep.dev`, via `app.config.js` et `APP_VARIANT=development`), qui
s'installe **à côté** de l'app publiée : un build local n'a pas la clé de signature EAS et ne
pourrait pas la remplacer. Chaque app a sa propre base et sa propre session (compte de dev
dans « PostKeep Dev », vrai compte dans PostKeep). Les **releases** restent sur EAS.

Prérequis Windows (une fois) : chemins longs activés (`LongPathsEnabled=1`), Android Studio,
SDK dans `%LOCALAPPDATA%\Android\Sdk` avec plateforme 37, build-tools 37.0.0,
NDK 27.1.12297006 et CMake 3.30.5 (versions de RN 0.88 ; à installer avec
`cmdline-tools\latest\bin\android.exe sdk install ndk/27.1.12297006 cmake/3.30.5 build-tools/37.0.0`
— le nouveau CLI attend des noms de paquets en chemin, pas `ndk;…`), JDK 21 Temurin (celui
d'Android Studio, en 25, est trop récent pour Kotlin 2.2), Node et Git.

**Piège ninja** : le `ninja.exe` livré avec les CMake du SDK (1.10.2) ignore les chemins longs,
et la compilation C++ de l'app dépasse 260 caractères (erreur
`ninja: error: mkdir(…rngesturehandler_codegen…): No such file or directory`). Remplacer le
`ninja.exe` de **chaque** `%LOCALAPPDATA%\Android\Sdk\cmake\<version>\bin` par ninja ≥ 1.12
(release officielle `ninja-build/ninja` v1.12.1, `ninja-win.zip`), en gardant l'ancien sous
`ninja-1.10.2.exe`. Gradle installe lui-même CMake 3.22.1 (C++ de l'app) au premier build, en
plus de 3.30.5 : vérifier `ninja.exe --version` dans les deux après ce premier build.

```powershell
# PowerShell Windows, téléphone branché
powershell -ExecutionPolicy Bypass -File \\wsl.localhost\Debian-dev\home\drakotomahefa\dev\zperso\postkeep\scripts\build-dev-android.ps1
```

Le script remet le clone de build `C:\dev\pk` à l'état de `master` du dépôt WSL (`-Branch` pour
une autre branche, déjà commitée), ne relance `npm ci` + `expo prebuild --clean` que si
`package-lock.json`, `app.json` ou `app.config.js` ont changé (`-Clean` pour forcer), compile
`assembleDebug` pour `arm64-v8a` seulement avec le cache Gradle, puis installe l'APK. Le JS
reste servi par Metro dans WSL, comme avant ; ouvrir l'app avec
`adb shell am start -a android.intent.action.VIEW -d "exp+postkeep://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8081" com.thejohninc.postkeep.dev`.

### Construire un dev client (rare)

Nécessaire seulement dans les cas du §4, ou pour installer l'app sur un nouveau téléphone.

```bash
npx eas-cli build --profile development --platform android
```

Le build se fait **dans le cloud** (pas besoin d'Android Studio ni d'une machine puissante).
À la fin, un QR code et un lien s'affichent : ouvrir le lien **sur le téléphone** pour installer l'APK.

> **Skia (verre liquide) rend le build natif lourd** : compilé pour 4 ABI et en parallèle, le
> démon Gradle manquait de mémoire sur la machine EAS (vu dans budget-app). Les profils
> d'`eas.json` limitent donc le build à `arm64-v8a` et à un seul worker Gradle (variables
> `env` de chaque profil). Ne pas les retirer.

> Le plan EAS gratuit a un quota mensuel de builds (15 builds Android ; à notre connaissance,
> le même quota pour tous les profils — ce n'est pas documenté explicitement). Une fois
> atteint, les builds sont **bloqués jusqu'au renouvellement** — jamais facturés
> automatiquement. Raison de plus pour grouper les changements natifs.

### ⚠️ EAS builde depuis `git HEAD`, pas depuis votre dossier de travail

L'archive envoyée au cloud est construite à partir du **dernier commit**. Un paquet natif
installé mais non commité **ne sera pas dans l'APK**, alors que `package.json` sur le disque
le mentionne — l'import compilera et plantera à l'exécution.

**Donc : commiter avant de lancer un build.** C'est arrivé le 24 août 2026 — `expo-clipboard`
venait d'être installé, le build est parti sur le commit précédent, et le module manque dans
le dev client jusqu'au prochain build.

Ça ne concerne **que le natif** : tout le JavaScript (écrans, requêtes, schéma Drizzle) est
servi par Metro depuis le dossier de travail et n'a jamais besoin d'être commité pour être
testé sur l'appareil. Un build `production`, lui, embarque le JavaScript : il prend donc
**tout** depuis le dernier commit.

---

## 8. Publier une release

Procédure suivie pour v0.2.0 (11 novembre 2026). Remplacer `X.Y.Z` par la version.

1. **Fusionner** la branche de travail dans `master` et se placer sur `master`.
2. **Monter la version** aux trois endroits :
   - `app.json` → `expo.version` (la version affichée par Android et par les Paramètres) ;
   - `package.json` + `package-lock.json` → `npm version X.Y.Z --no-git-tag-version` ;
   - `CHANGELOG.md` → renommer `[Non publié]` en `[X.Y.Z] — <date>`, avec le lien vers la
     release, et laisser un `[Non publié]` vide au-dessus.
3. **Commiter** (`chore: release X.Y.Z`) — **avant** le build, EAS builde depuis `HEAD` (§7).
4. **Builder** l'APK autonome :
   ```bash
   npx eas-cli build -p android --profile production
   ```
5. **Télécharger l'APK** depuis le lien affiché en fin de build (ou la page du build sur
   expo.dev) et le nommer `postkeep-vX.Y.Z.apk`. L'installer sur le téléphone pour vérifier.
6. **Tagger et pousser** :
   ```bash
   git tag vX.Y.Z
   git push origin master vX.Y.Z
   ```
7. **Créer la GitHub Release**, notes **en anglais** dans un fichier hors du dépôt :
   ```bash
   gh release create vX.Y.Z postkeep-vX.Y.Z.apk --title "PostKeep vX.Y.Z" --notes-file <notes.md>
   ```
8. **Vérifier l'asset** :
   ```bash
   gh release view vX.Y.Z --json assets -q '.assets[].name'   # → postkeep-vX.Y.Z.apk
   ```

Ne pas laisser l'APK téléchargé dans le dossier du projet.

---

## 9. Compte et synchronisation (Supabase)

Fonctionnement et décisions : [ARCHITECTURE.md](./ARCHITECTURE.md) §12. Projet Supabase
`xrzubssvamvmfjeokbyy` (tier gratuit). `@supabase/supabase-js` est 100 % JavaScript :
toucher à la synchro ne demande jamais de rebuild.

### Appliquer une migration

Les migrations SQL versionnées vivent dans `supabase/migrations/`
(`AAAAMMJJHHMMSS_nom.sql`). Pas de `supabase db push` : on les applique par l'**API de
gestion**, avec le jeton personnel de `~/.supabase/access-token` (pas besoin du mot de
passe de la base) :

```bash
REF=xrzubssvamvmfjeokbyy
curl -fsS -X POST "https://api.supabase.com/v1/projects/$REF/database/query" \
  -H "Authorization: Bearer $(cat ~/.supabase/access-token)" \
  -H "Content-Type: application/json" \
  --data "$(jq -Rs '{query: .}' supabase/migrations/<fichier>.sql)"
```

Ou coller le fichier dans l'éditeur SQL du tableau de bord (SQL Editor). Une migration
n'est appliquée qu'une fois : en écrire une nouvelle plutôt que de modifier une ancienne.

> ⚠️ **Toute nouvelle table de `public` reçoit par défaut tous les droits** (`DELETE`
> compris) pour `anon` et `authenticated` sur ce projet. Une table créée par migration doit
> donc `revoke all … from anon, authenticated`, puis accorder le strict utile, et activer la
> RLS — comme `20261111000000_account_sync.sql`.

### Icône et écran de démarrage

Sources SVG dans `assets/icon-source/` (piste « Glacier », grille adaptative Android de 108 :
72 visibles). Après une retouche, régénérer les PNG puis refaire un build natif (l'icône et
le splash sont compilés dans l'APK, Metro ne les recharge pas) :

```bash
for f in android-icon-background android-icon-foreground android-icon-monochrome icon splash-icon; do
  npx -y @resvg/resvg-js-cli --fit-width 1024 assets/icon-source/$f.svg assets/images/$f.png
done
npx -y @resvg/resvg-js-cli --fit-width 48 assets/icon-source/icon.svg assets/images/favicon.png
```

### Compte de dev

Le bac à sable de vérification : `postkeep-dev@example.com`, rempli de façon à couvrir tout
ce qui peut casser l'affichage — toutes les plateformes (dont un vrai post Reddit avec sa
miniature), vignettes verticale / carrée / paysage / cassée (404), note et légende très
longues, nom de collection de 60 caractères, accents et emoji (recherche insensible aux
accents), un post dans toutes les collections (troncature `+N`), une collection vide, un
lien inconnu, un post déjà ouvert, un post de 2024 (date avec année), une pierre tombale
qui ne doit jamais s'afficher, et 40 posts de volume pour le défilement et la grille
(70 posts, 11 collections). Un cas à couvrir de plus → l'ajouter à la référence du script. Identifiants dans `.env.local` (`POSTKEEP_DEV_EMAIL`,
`POSTKEEP_DEV_PASSWORD`), jamais commités.

```bash
npm run seed:dev              # crée le compte s'il manque, ajoute la référence manquante
npm run seed:dev -- --reset   # réécrit la référence et supprime tout le reste
```

Sans `--reset`, le script ne modifie ni ne supprime rien d'existant. `--reset` remet le
compte exactement à la référence (ce qui a été ajouté à la main pendant un test est
supprimé : un cas qui mérite de rester va dans la référence).
Contenu de référence : `scripts/seed-dev-account.mjs`.

⚠️ Se connecter à ce compte sur un téléphone qui a des posts **sans compte** les rattache
au compte de dev (fusion à la première connexion). Sur le téléphone de tous les jours,
d'abord se connecter à son vrai compte, ou se déconnecter de tout compte avec une base vide.

### Réinitialiser un mot de passe

Il n'y a pas de « mot de passe oublié » dans l'app : la confirmation d'email est coupée
(`mailer_autoconfirm: true`) faute de SMTP — le service d'email intégré de Supabase
n'envoie qu'aux membres de l'équipe du projet, 2 emails par heure (TODO). Pour un
utilisateur qui a oublié le sien, depuis le tableau de bord → SQL Editor :

```sql
update auth.users
set encrypted_password = extensions.crypt('<nouveau mot de passe, 8 caractères min.>', extensions.gen_salt('bf'))
where email = '<email du compte>';
```

Puis lui transmettre le mot de passe par un autre canal. Ne jamais commiter ni coller ce
mot de passe dans un fichier du dépôt.

### Réveil du projet (keepalive)

Le tier gratuit se met en pause après 7 jours sans requête. Le workflow
`.github/workflows/supabase-keepalive.yml` lit l'API REST chaque jour (06:17 UTC ; GitHub
saute parfois une exécution planifiée, d'où la marge), avec les
secrets GitHub `SUPABASE_URL` et `SUPABASE_PUBLISHABLE_KEY` (`gh secret set`).

```bash
gh workflow run supabase-keepalive.yml                  # lancer à la main
gh run list --workflow supabase-keepalive.yml -L 5      # derniers passages
gh workflow enable supabase-keepalive.yml               # le réactiver
```

- Un déclencheur `schedule` ne tourne que depuis la **branche par défaut** (`master`) : rien
  ne part tant que la branche `feat/account-sync` n'est pas fusionnée.
- **GitHub désactive un workflow planifié après 60 jours sans activité sur le dépôt.** Il
  prévient par email ; `gh workflow enable` (ou le bouton de l'onglet Actions) le relance.
- Projet déjà en pause : la synchro échoue proprement (erreur dans la ligne d'état des
  Paramètres). Le relancer depuis le tableau de bord Supabase (Restore project).

### Sauvegarder la base du téléphone avant un test destructif

Déconnexion et suppression de compte **vident la base locale**. Avant de les tester, ou
avant la première connexion d'un téléphone qui a de vraies données : utiliser un compte de
test dédié, et copier la base **hors du dépôt** (même `ADB` qu'au §3) :

```bash
mkdir -p ~/backups/postkeep
$ADB exec-out run-as com.thejohninc.postkeep cat files/SQLite/postkeep.db \
  > ~/backups/postkeep/postkeep-$(date +%F).db
```

`run-as` ne marche que sur un build débogable (le dev client), pas sur l'APK de
production. Si `files/SQLite/postkeep.db-wal` existe, le copier aussi (app arrêtée
d'abord) : il peut contenir les dernières écritures.

---

## 10. Vérifier que le projet est sain

Trois commandes à connaître. À lancer après toute installation, et avant tout commit important.

```bash
npx expo-doctor              # 20 vérifications (SDK 58) : versions, peer deps, config native
npx expo install --check     # les versions correspondent-elles au SDK 58 ?
npx @react-native-reusables/cli doctor --yes   # config NativeWind + RNR complète ?
```

**Objectif : `20/20 checks passed` et `All checks passed`.**

Si `expo-doctor` signale un décalage de versions :

```bash
npx expo install --fix
```

C'est normal et sans danger : Expo publie des versions patch régulièrement.

### Monter de SDK Expo

Procédure qui a fonctionné pour le passage SDK 57 → 58 (novembre 2026) :

1. `npx expo install expo@^58.0.0 --fix` — a échoué (`ERESOLVE`) : `expo-share-intent` 8
   exige `expo` ^57 en peer.
2. Passer `expo-share-intent` à la version du nouveau SDK (9.0.0), puis régénérer le lockfile.
3. `npx expo install --fix`, puis les deux doctors (ci-dessus) et les types.
4. Lire les notes de version des majeures (ex. gesture-handler 3 : `Swipeable` retiré).
5. **Nouveau dev build obligatoire** (le natif change), puis tester sur appareil (§4, §7).

### Tests unitaires

Les tests (`node:test`, logique pure de `src/lib/`, de `src/lib/sync/` et du calcul de
tuiles) se lancent avec :

```bash
node --experimental-strip-types --no-warnings --test src/lib/*.test.ts src/lib/sync/*.test.ts src/screens/collections/tile-size.test.ts
# → tests 59, pass 59
```

`npm test` lance exactement cette commande (Node 22 comme Node 24). Un nouveau dossier de
tests doit être ajouté à la liste du script `test` de `package.json` : Node 22.13 ne
découvre pas seul les fichiers `.ts`.

---

## 11. Règles strictes — ne jamais faire

| Interdit | Pourquoi |
|---|---|
| `npm audit fix --force` | Casse les versions alignées par `expo install`. Les alertes `npm audit` sur ce projet sont attendues, on les ignore. |
| `react-native-reusables init` | Recrée un projet en SDK 56, écrase la config. |
| `npm install` pour un paquet du registre Expo | Installe une version incompatible avec le SDK. Toujours `expo install` d'abord. |
| Passer NativeWind en v5 / Tailwind en v4 | Casse React Native Reusables. |
| Stocker des données métier dans Zustand | Zustand = **état UI uniquement** (filtre actif, modale ouverte). Les données vivent dans SQLite. |
| Contourner une erreur de module natif avec un patch maison | Un module incompatible doit être **identifié et signalé**, pas masqué. |

---

## 12. Carte du projet

```
postkeep/
├── src/
│   ├── app/                    # Routes UNIQUEMENT — expo-router : 1 fichier = 1 route
│   │   ├── _layout.tsx         #   Layout racine : providers globaux + Stack
│   │   ├── +native-intent.tsx  #   Redirection des partages entrants (app fermée)
│   │   ├── shareintent.tsx     #   Écran de réception d'un partage (modale)
│   │   ├── collection/[id].tsx #   Contenu d'une collection
│   │   └── (tabs)/             #   Groupe d'onglets (barre flottante glass-tab-bar.tsx)
│   │       ├── _layout.tsx
│   │       ├── index.tsx       #     All posts ("/")
│   │       └── collections.tsx #     Collections
│   ├── screens/                # Corps des écrans complexes (save-post, collections, collection)
│   ├── components/             # post-card, post-grid-cell, post-detail-sheet, settings-sheet,
│   │   │                       # account-sheet, sheet-kit (feuilles + ConfirmDialog)…
│   │   └── ui/                 # Composants React Native Reusables (copiés, modifiables)
│   ├── db/
│   │   ├── index.ts            #   Ouverture de la base (enableChangeListener)
│   │   ├── schema.ts           #   Schéma Drizzle
│   │   ├── posts.ts, collections.ts  # Requêtes
│   │   └── migrations/         #   Migrations générées par drizzle-kit
│   ├── lib/                    # Logique pure, testée (*.test.ts) : share-url, post-filters,
│   │   │                       # format-date… + design.ts (jetons), theme.ts (THEME, NAV_THEME)
│   │   ├── webview-metadata.tsx #  Légende + miniature Instagram/TikTok (WebView cachée)
│   │   ├── supabase.ts         #   Client Supabase (session dans le kv-store)
│   │   └── sync/               #   Synchro : logic.ts (pur, testé), engine.ts, account.ts
│   ├── stores/                 # Zustand — état d'interface uniquement
│   └── hooks/                  # dont use-account-sync.ts (déclencheurs de synchro)
├── supabase/migrations/        # Migrations SQL du serveur (appliquées à la main, §9)
├── .github/workflows/          # supabase-keepalive.yml (réveil du projet Supabase)
├── .env.example                # Modèle de .env.local (non commité)
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

## 13. Règles de code spécifiques au projet

Les règles complètes et leurs justifications sont dans
[ARCHITECTURE.md](./ARCHITECTURE.md) — **source de vérité**, ne pas dupliquer ici.
Le rappel minimal pour le travail quotidien :

- **Données persistantes → SQLite** (Drizzle). Jamais dans Zustand, jamais dans un `useState`.
  Zustand ne sert qu'à l'état d'interface (filtre actif, modale ouverte).
- **Ouvrir la base avec `enableChangeListener: true`**, sinon `useLiveQuery` ne réagit à rien.
- **5 colonnes obligatoires** sur toute table : `id` (TEXT, UUID client), `created_at`,
  `updated_at`, `deleted_at`, `user_id` → [détail et raisons](./ARCHITECTURE.md#4-schéma-de-données--5-colonnes-obligatoires).
- **Jamais de vrai `DELETE`** — mettre `deleted_at` à jour, et filtrer
  `WHERE deleted_at IS NULL` dans **toutes** les lectures. Seules exceptions : le vidage de
  l'appareil à la déconnexion / suppression du compte (ARCHITECTURE.md §12).
- **Couleurs du thème uniquement** (`bg-background`, `text-foreground`…), jamais de couleur
  en dur : sinon le mode sombre casse.

---

## 14. Dépannage

| Symptôme | Cause probable | Solution |
|---|---|---|
| Le dev client ne trouve pas le serveur | Téléphone et PC sur des réseaux différents | Même Wi-Fi, ou saisir `exp://<IP>:8081` manuellement |
| Le QR code « charge » indéfiniment (WSL) | Réseau `mirrored` : le pare-feu Hyper-V de WSL bloque le port 8081 en entrée | `npx expo start --dev-client --tunnel`, ou câble USB + `adb reverse tcp:8081 tcp:8081` (§3) |
| Les modifications n'apparaissent plus sur le téléphone, sans erreur | Metro lancé avec `CI=1` : le rechargement est désactivé | Relancer Metro sans `CI=1` |
| Le dev client plante à l'ouverture d'un deep link (« App react context shouldn't be created before… ») | Processus de l'app resté vivant | `adb shell am force-stop com.thejohninc.postkeep`, puis relancer le deep link (§3) |
| Un build ne contient pas un module natif pourtant installé | Le module n'était pas commité : EAS builde depuis `HEAD` | Commiter, relancer le build (§7) |
| Lien de téléchargement d'un vieux build « Expired » | Les artefacts EAS expirent | Prendre l'APK de la GitHub Release (§8) |
| `npm test` n'exécute pas un nouveau test | Son dossier manque dans le script `test` de `package.json` | L'ajouter à la liste |
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
| Erreur au démarrage « `EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY manquants` » | Pas de `.env.local` (dev) ou pas de variables EAS pour l'environnement du profil (build) | Créer `.env.local` puis `npx expo start --dev-client --clear` (§2) ; pour un build, `eas env:list` (§7) |
| La synchro reste en erreur alors que le réseau marche | Projet Supabase en pause (keepalive désactivé) | Le relancer depuis le tableau de bord, réactiver le workflow (§9) |
| Un utilisateur a oublié son mot de passe | Pas de « mot de passe oublié » sans SMTP | Réinitialisation à la main (§9) |

---

## 15. Résumé — la journée type

```bash
# 1. Démarrer (une fois le matin) — --tunnel sous WSL, voir §3
npx expo start --dev-client --tunnel

# 2. Coder. Sauvegarder. Regarder le téléphone. Répéter.
#    → Fast Refresh, aucune commande à relancer.

# 3. Après avoir installé quoi que ce soit
npx expo-doctor

# 4. Uniquement si le natif a changé
npx eas-cli build --profile development --platform android
```

**Le reste du temps, tu ne touches ni à EAS, ni à un build, ni à ton téléphone.**
