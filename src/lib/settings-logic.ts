/**
 * Logique pure de l'écran Paramètres : préférence de thème et contenu de l'export.
 * Testée par `settings-logic.test.ts` ; le stockage et le partage sont dans
 * `src/lib/settings.ts` et `src/components/settings-sheet.tsx`.
 */

export type ThemePreference = 'system' | 'light' | 'dark';

export function parseThemePreference(raw: string | null): ThemePreference {
  return raw === 'light' || raw === 'dark' ? raw : 'system';
}

/** Valeur à passer à `Appearance.setColorScheme` : « unspecified » suit le téléphone. */
export function toColorScheme(pref: ThemePreference): 'light' | 'dark' | 'unspecified' {
  return pref === 'system' ? 'unspecified' : pref;
}

type ExportablePost = {
  url: string | null;
  caption: string | null;
  note: string | null;
  createdAt: Date;
  collectionNames: string[];
};

/** Export lisible de tous les posts : seulement ce qui a du sens pour l'utilisateur
 *  (pas d'identifiants ni de colonnes de synchronisation). */
export function buildExport(posts: ExportablePost[], now: Date = new Date()): string {
  return JSON.stringify(
    {
      app: 'PostKeep',
      exportedAt: now.toISOString(),
      posts: posts.map((p) => ({
        url: p.url,
        caption: p.caption,
        note: p.note,
        collections: p.collectionNames,
        savedAt: p.createdAt.toISOString(),
      })),
    },
    null,
    2
  );
}
