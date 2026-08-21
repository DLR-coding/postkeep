# PostKeep

Application mobile **Android** qui centralise les posts sauvegardés depuis les réseaux
sociaux (Instagram, TikTok, X, Threads…), avec prise de notes et organisation par collections.

Le problème qu'elle résout : les posts « enregistrés » dans chaque app deviennent des
cimetières illisibles, cloisonnés par plateforme, sans recherche ni contexte. PostKeep les
rassemble au même endroit, avec vos propres notes.

---

## État du projet

| | |
|---|---|
| **Phase actuelle** | Phase 1 — Fondation données (voir [ROADMAP.md](./ROADMAP.md)) |
| **Plateforme** | Android uniquement en V1 (iOS envisagé plus tard) |
| **Architecture** | Local-first — SQLite est la source de vérité, l'app fonctionne hors ligne et sans compte |
| **Backend** | Aucun en V1 (contrainte : coût zéro). Synchronisation prévue en V1.5 |

⚠️ **L'app n'est pas encore utilisable.** L'initialisation technique est terminée
(elle build, se lance, reçoit un partage), mais aucune fonctionnalité produit n'est
implémentée.

---

## Comment ça marche (parcours utilisateur cible)

```
Instagram/TikTok  →  Partager  →  PostKeep s'ouvre
                                        ↓
                        Choisir une collection + écrire une note
                                        ↓
                              Retour à l'app d'origine
                                        ↓
                   Plus tard : retrouver, chercher, rouvrir le post
```

---

## Stack

| Domaine | Choix |
|---|---|
| Framework | Expo SDK 57 / React Native 0.86 / React 19.2 / TypeScript |
| Navigation | `expo-router` (routing par fichiers) |
| Style | NativeWind 4 + Tailwind 3 (versions épinglées) |
| Composants | [React Native Reusables](https://reactnativereusables.com) (shadcn/ui pour mobile) |
| Données | `expo-sqlite` + Drizzle ORM |
| État UI | Zustand (état d'interface uniquement — jamais les données) |
| Formulaires | react-hook-form + Zod |
| Réception des partages | `expo-share-intent` |
| Build & distribution | EAS Build (cloud) |

Le détail des choix et de leurs raisons : [ARCHITECTURE.md](./ARCHITECTURE.md).

---

## Démarrage rapide

**Prérequis :** Node.js 22.13.x, un téléphone Android, le même réseau Wi-Fi que votre PC.

```bash
npm install
npx expo start --dev-client
```

Puis ouvrir l'app **postkeep** sur le téléphone et se connecter au serveur affiché.

⚠️ **Expo Go ne fonctionne pas sur ce projet** — il faut un *development build*.
La procédure complète (installation du dev client, quand reconstruire, dépannage) est dans
[DEVELOPMENT.md](./DEVELOPMENT.md). **À lire avant de commencer.**

---

## Documentation

| Fichier | À lire quand |
|---|---|
| [DEVELOPMENT.md](./DEVELOPMENT.md) | **En premier.** Comment lancer, coder, tester au quotidien |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Avant d'écrire du code — les règles non négociables et leurs raisons |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | Avant votre première contribution — git, commits, conventions de code |
| [ROADMAP.md](./ROADMAP.md) | Pour comprendre où va le projet et ce qui est dans quelle phase |
| [TODO.md](./TODO.md) | Pour trouver quoi faire maintenant |
| [CHANGELOG.md](./CHANGELOG.md) | Ce qui a changé, version par version |
| [INIT.md](./INIT.md) | Archive historique de l'initialisation — pas une référence courante |

---

## Licence

Voir [LICENSE](./LICENSE).
