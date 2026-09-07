# PostKeep

**Android** mobile app that centralizes posts saved from social networks
(Instagram, TikTok, X, Threads…), with note-taking and organization by collections.

The problem it solves: posts "saved" in each app become unreadable graveyards,
siloed by platform, with no search and no context. PostKeep brings them together
in one place, with your own notes.

---

## Project status

| | |
|---|---|
| **Current phase** | Phase 1 — Data foundation (see [ROADMAP.md](./ROADMAP.md)) |
| **Platform** | Android only in V1 (iOS considered later) |
| **Architecture** | Local-first — SQLite is the source of truth, the app works offline and without an account |
| **Backend** | None in V1 (constraint: zero cost). Sync planned for V1.5 |

⚠️ **The app is not usable yet.** Technical bootstrapping is done
(it builds, launches, receives a share), but no product feature is
implemented yet.

---

## How it works (target user journey)

```
Instagram/TikTok  →  Share  →  PostKeep opens
                                        ↓
                        Choose a collection + write a note
                                        ↓
                          Back to the original app
                                        ↓
                Later: find, search, reopen the post
```

---

## Stack

| Area | Choice |
|---|---|
| Framework | Expo SDK 57 / React Native 0.86 / React 19.2 / TypeScript |
| Navigation | `expo-router` (file-based routing) |
| Style | NativeWind 4 + Tailwind 3 (pinned versions) |
| Components | [React Native Reusables](https://reactnativereusables.com) (shadcn/ui for mobile) |
| Data | `expo-sqlite` + Drizzle ORM |
| UI state | Zustand (interface state only — never data) |
| Forms | react-hook-form + Zod |
| Share intake | `expo-share-intent` |
| Build & distribution | EAS Build (cloud) |

Details on these choices and their reasons: [ARCHITECTURE.md](./ARCHITECTURE.md).

---

## Quick start

**Prerequisites:** Node.js 22.13.x, an Android phone, the same Wi-Fi network as your PC.

```bash
npm install
npx expo start --dev-client
```

Then open the **postkeep** app on the phone and connect to the server shown.

⚠️ **Expo Go does not work on this project** — a *development build* is required.
The full procedure (installing the dev client, when to rebuild, troubleshooting) is in
[DEVELOPMENT.md](./DEVELOPMENT.md). **Read it before you start.**

---

## Documentation

| File | Read when |
|---|---|
| [DEVELOPMENT.md](./DEVELOPMENT.md) | **First.** How to run, code, and test day to day |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Before writing code — the non-negotiable rules and their reasons |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | Before your first contribution — git, commits, code conventions |
| [ROADMAP.md](./ROADMAP.md) | To understand where the project is going and what's in which phase |
| [TODO.md](./TODO.md) | To find out what to do now |
| [CHANGELOG.md](./CHANGELOG.md) | What changed, version by version |
| [INIT.md](./INIT.md) | Historical archive of the initial setup — not a current reference |

---

## License

See [LICENSE](./LICENSE).
