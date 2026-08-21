# Instructions pour les agents — PostKeep

## Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any
code. Verify library documentation with Context7 rather than relying on training data —
several decisions on this project were made on outdated assumptions and had to be reverted.

## Lire avant de coder

| Document | Contenu |
|---|---|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Décisions techniques en vigueur — **fait foi** |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | Conventions de code, workflow git |
| [DEVELOPMENT.md](./DEVELOPMENT.md) | Lancement, rebuild, dépannage |
| [TODO.md](./TODO.md) | Tâches en cours |

`INIT.md` est une **archive historique**, pas une référence — certaines de ses décisions ont
été corrigées depuis.

## Contraintes non négociables

- **NativeWind 4.2.6 / Tailwind 3.4.19 épinglés.** La doc Expo recommande NativeWind v5 pour
  le SDK 57 : ne pas la suivre, elle casse React Native Reusables.
- **Ne jamais lancer `npm audit fix --force`** — casse l'alignement des versions.
- **Ne jamais lancer `react-native-reusables init`** — recrée un projet en SDK 56.
- **`npx expo install` avant `npm install`**, systématiquement.
- **Données persistantes → SQLite uniquement.** Zustand ne stocke que de l'état d'interface.
- **Jamais de vrai `DELETE`** — suppression logique via `deleted_at`.
- En cas d'incompatibilité d'un module natif : **s'arrêter et signaler**, ne pas contourner
  avec un correctif maison.

## Vérifier son travail

```bash
npx expo-doctor                                # doit afficher 21/21
npx @react-native-reusables/cli doctor --yes   # doit afficher "All checks passed"
```
