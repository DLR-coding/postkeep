import { Appearance } from 'react-native';
import Storage from 'expo-sqlite/kv-store';

import {
  parsePostsLayout,
  parseThemePreference,
  toColorScheme,
  type PostsLayout,
  type ThemePreference,
} from './settings-logic';

/** Préférences de l'appareil. Stockées dans le magasin clé-valeur d'expo-sqlite (SQLite,
 *  conforme à AGENTS.md) : une préférence d'appareil, pas une donnée à synchroniser,
 *  donc pas de table dans le schéma Drizzle. */
const THEME_KEY = 'theme';

export function loadThemePreference(): ThemePreference {
  return parseThemePreference(Storage.getItemSync(THEME_KEY));
}

/** Applique le thème à toute l'app : `Appearance` est lu par `useColorScheme` (React
 *  Native) et par NativeWind. */
export function applyThemePreference(pref: ThemePreference): void {
  Appearance.setColorScheme(toColorScheme(pref));
}

export function saveThemePreference(pref: ThemePreference): void {
  Storage.setItemSync(THEME_KEY, pref);
  applyThemePreference(pref);
}

const LAYOUT_KEY = 'postsLayout';

export function loadPostsLayout(): PostsLayout {
  return parsePostsLayout(Storage.getItemSync(LAYOUT_KEY));
}

export function savePostsLayout(layout: PostsLayout): void {
  Storage.setItemSync(LAYOUT_KEY, layout);
}
