/**
 * Teinte pastel stable par collection (refonte, système de design de la référence
 * « Invite » : ronds pastel avec l'initiale). Logique pure, testée par
 * `collection-tint.test.ts`. Le nom sert de graine : une collection garde sa teinte
 * d'un écran à l'autre sans rien stocker en base.
 */

export type Tint = {
  light: { bg: string; fg: string };
  dark: { bg: string; fg: string };
};

export const TINTS: readonly Tint[] = [
  { light: { bg: '#ece6fb', fg: '#6a46d4' }, dark: { bg: '#2d2547', fg: '#b9a6ff' } }, // lavande
  { light: { bg: '#e3ecfd', fg: '#2f6fe0' }, dark: { bg: '#1f2c48', fg: '#8db4ff' } }, // bleu
  { light: { bg: '#fde4ea', fg: '#d42c5a' }, dark: { bg: '#43212c', fg: '#ff8fae' } }, // rose
  { light: { bg: '#e2f5e8', fg: '#2e9a54' }, dark: { bg: '#1c3527', fg: '#7fd9a0' } }, // vert
  { light: { bg: '#fdebdc', fg: '#cc6a22' }, dark: { bg: '#40291a', fg: '#ffb27a' } }, // pêche
  { light: { bg: '#faf1d2', fg: '#9c7a0c' }, dark: { bg: '#3a3217', fg: '#ecd06a' } }, // jaune
];

export function collectionTint(name: string): Tint {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + (char.codePointAt(0) ?? 0)) >>> 0;
  return TINTS[hash % TINTS.length];
}

/** Première lettre (ou emoji) en majuscule ; « ? » pour un nom vide. */
export function collectionInitial(name: string): string {
  const first = Array.from(name.trim())[0];
  return first ? first.toUpperCase() : '?';
}
