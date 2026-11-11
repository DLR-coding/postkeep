# PostKeep

**Android** app that centralizes posts saved from social networks, with your own notes and
organization by collections.

The problem it solves: posts "saved" in each app become unreadable graveyards, siloed by
platform, with no search and no context. PostKeep brings them together in one place.

---

## Install

**Latest release: [v0.2.0](https://github.com/DLR-coding/postkeep/releases/tag/v0.2.0)**
(11 November 2026).

1. On the phone, download `postkeep-v0.2.0.apk` from the release page.
2. Open it and allow installation from this source when Android asks.
3. Share a post from Instagram, TikTok, X… and pick **PostKeep** in the share sheet.

Installing a newer APK over an older one keeps your data.

---

## Supported platforms

| Platform | Recognized | Caption | Thumbnail |
|---|---|---|---|
| Instagram | ✅ | ✅ | ✅ |
| TikTok | ✅ | ✅ | ✅ |
| X (Twitter) | ✅ | ✅ | ❌ |
| Reddit | ✅ | ❌ | ❌ |
| Threads | ✅ | ❌ | ❌ |
| Any other link (YouTube, articles…) | Saved as a plain link | ❌ | ❌ |

When no caption can be fetched, PostKeep falls back to the text that came with the share.

---

## Features

- **Save from the share sheet**: add a note and one or more collections. Sharing the same
  post again reopens it instead of creating a duplicate.
- **All posts**: list or 3-column grid (your choice is remembered), filters by platform
  (All / Instagram / TikTok / X / Reddit), sorted by save date.
- **Search** across captions, notes and links, accent-insensitive, with highlighted matches.
- **Collections** shown as folders; a post can belong to several.
- **Post detail**: open the original post in its app, edit, delete.
- **Settings** (⚙ in All posts): system / light / dark theme, export all posts as JSON.
- **Local-first**: everything is stored on the phone (SQLite), works offline, no account.

---

## Project status

| | |
|---|---|
| **Version** | 0.2.0 — see [CHANGELOG.md](./CHANGELOG.md) |
| **Platform** | Android only in V1 (iOS considered later) |
| **Architecture** | Local-first — SQLite is the source of truth |
| **Backend** | None in V1 (constraint: zero cost). Accounts + sync planned for V1.5 |

What's next: [ROADMAP.md](./ROADMAP.md) and [TODO.md](./TODO.md).

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
| Build & distribution | EAS Build (cloud), APK on GitHub Releases |

Details on these choices and their reasons: [ARCHITECTURE.md](./ARCHITECTURE.md).

---

## Development quick start

**Prerequisites:** Node.js 22.13.x, an Android phone with the PostKeep development build.

```bash
npm install
npx expo start --dev-client --tunnel
```

Then open the **postkeep** app on the phone and connect to the server shown.

⚠️ **Expo Go does not work on this project** — a *development build* is required.
The full procedure (which build is for what, when to rebuild, releasing, troubleshooting)
is in [DEVELOPMENT.md](./DEVELOPMENT.md). **Read it before you start.**

---

## Documentation

| File | Read when |
|---|---|
| [DEVELOPMENT.md](./DEVELOPMENT.md) | **First.** How to run, code, test and release |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Before writing code — the non-negotiable rules and their reasons |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | Before your first contribution — git, commits, code conventions |
| [ROADMAP.md](./ROADMAP.md) | To understand where the project is going and what's in which phase |
| [TODO.md](./TODO.md) | To find out what to do now |
| [CHANGELOG.md](./CHANGELOG.md) | What changed, version by version |
| [INIT.md](./INIT.md) | Historical archive of the initial setup — not a current reference |

---

## License

See [LICENSE](./LICENSE).
