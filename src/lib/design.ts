/**
 * Jetons de forme et d'espacement (système de design des références : cartes très
 * arrondies, champs et boutons de même hauteur et même rayon, marges régulières).
 * Les couleurs restent dans `theme.ts` / `global.css`.
 */
export const RADIUS = {
  /** Petits encarts dans une ligne (note de la liste). */
  inset: 12,
  /** Champs et boutons (48 px de haut). */
  control: 16,
  /** Cartes, dossiers. */
  card: 24,
  /** Haut des feuilles du bas. */
  sheet: 28,
} as const;

export const SPACE = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 } as const;

export const CONTROL_HEIGHT = 48;
