// Réglages du verre liquide de la barre flottante (écran src/screens/glass). Logique pure : les
// paramètres, leurs bornes (curseurs de webgl-apple-liquid-glass quand ils existent, repris de
// budget-app) et le nettoyage de ce qui est relu du stockage.

export type GlassSettings = {
  // Transmission (matériau V2 de la référence)
  refraction: number;
  edgeReach: number;
  edgeWidth: number;
  dispersion: number;
  // Matière
  body: number;
  absorption: number;
  barTint: number;
  lensTint: number;
  // Lumière
  rim: number;
  reflection: number;
  highlight: number;
  lightAngle: number;
  echo: number;
  hairline: number;
  hairWidth: number;
  // Mouvement de la bulle
  snapStiffness: number;
  snapDamping: number;
  lagStiffness: number;
  lagDamping: number;
  edgeGive: number;
};

export type GlassKey = keyof GlassSettings;
export type GlassParam = { key: GlassKey; label: string; min: number; max: number; step: number };

// Valeurs finales réglées dans budget-app.
export const DEFAULT_GLASS: GlassSettings = {
  refraction: 84,
  edgeReach: 0.14,
  edgeWidth: 0.21,
  dispersion: 2,
  body: 0.72,
  absorption: 0.58,
  barTint: 0.35,
  lensTint: 0.16,
  rim: 0.24,
  reflection: 0.31,
  highlight: 0.34,
  lightAngle: 136,
  echo: 0.28,
  hairline: 0.92,
  hairWidth: 0.52,
  snapStiffness: 320,
  snapDamping: 22,
  lagStiffness: 200,
  lagDamping: 20,
  edgeGive: 6,
};

export const GLASS_SECTIONS: { title: string; params: GlassParam[] }[] = [
  {
    title: 'Transmission',
    params: [
      { key: 'refraction', label: 'Refraction', min: 0, max: 110, step: 1 },
      { key: 'edgeReach', label: 'Edge capture reach', min: 0, max: 1.6, step: 0.01 },
      { key: 'edgeWidth', label: 'Edge capture width', min: 0, max: 0.55, step: 0.01 },
      { key: 'dispersion', label: 'Dispersion (color fringes)', min: 0, max: 7, step: 0.1 },
    ],
  },
  {
    title: 'Material',
    params: [
      { key: 'body', label: 'Body', min: 0, max: 1.5, step: 0.01 },
      { key: 'absorption', label: 'Absorption', min: 0, max: 2, step: 0.01 },
      { key: 'barTint', label: 'Bar tint', min: 0, max: 1, step: 0.01 },
      { key: 'lensTint', label: 'Bubble tint', min: 0, max: 1, step: 0.01 },
    ],
  },
  {
    title: 'Light',
    params: [
      { key: 'rim', label: 'Rim light', min: 0, max: 1, step: 0.01 },
      { key: 'reflection', label: 'Reflection', min: 0, max: 1.5, step: 0.01 },
      { key: 'highlight', label: 'Highlight', min: 0, max: 1.5, step: 0.01 },
      { key: 'lightAngle', label: 'Light angle (°)', min: -180, max: 180, step: 1 },
      { key: 'echo', label: 'Echo', min: 0, max: 1.5, step: 0.01 },
      { key: 'hairline', label: 'Hairline', min: 0, max: 1.5, step: 0.01 },
      { key: 'hairWidth', label: 'Hairline width', min: 0, max: 1, step: 0.01 },
    ],
  },
  {
    title: 'Motion',
    params: [
      { key: 'snapStiffness', label: 'Stiffness', min: 50, max: 900, step: 10 },
      { key: 'snapDamping', label: 'Damping (lower = more bounce)', min: 4, max: 70, step: 1 },
      { key: 'lagStiffness', label: 'Trail stiffness', min: 50, max: 900, step: 10 },
      { key: 'lagDamping', label: 'Trail damping', min: 4, max: 70, step: 1 },
      { key: 'edgeGive', label: 'Edge stretch (dp)', min: 0, max: 20, step: 1 },
    ],
  },
];

const PARAMS = new Map(GLASS_SECTIONS.flatMap((s) => s.params).map((p) => [p.key, p]));

/** Valeur ramenée dans les bornes du paramètre et sur son pas. */
export function clampParam(key: GlassKey, value: number): number {
  const p = PARAMS.get(key);
  if (!p || !Number.isFinite(value)) return DEFAULT_GLASS[key];
  const stepped = Math.round((value - p.min) / p.step) * p.step + p.min;
  return Number(Math.min(p.max, Math.max(p.min, stepped)).toFixed(4));
}

/** Réglages relus du stockage (JSON d'une version précédente, abîmé ou absent) : les clés
 *  connues sont bornées, les autres ignorées, les manquantes prennent leur valeur par défaut. */
export function sanitizeGlass(raw: unknown): GlassSettings {
  const out = { ...DEFAULT_GLASS };
  if (!raw || typeof raw !== 'object') return out;
  for (const key of Object.keys(DEFAULT_GLASS) as GlassKey[]) {
    const v = (raw as Record<string, unknown>)[key];
    if (typeof v === 'number') out[key] = clampParam(key, v);
  }
  return out;
}

export function parseGlass(json: string | null): GlassSettings {
  if (!json) return { ...DEFAULT_GLASS };
  try {
    return sanitizeGlass(JSON.parse(json));
  } catch {
    return { ...DEFAULT_GLASS };
  }
}
