const NUM_COLUMNS = 3;
const TILE_MARGIN = 6; // gap-3 (12px) réparti à 6px de chaque côté de chaque tuile
const GRID_PADDING = 16; // padding visuel visé en bord d'écran

/** `FlashList numColumns` ne fait que positionner les colonnes — il ne stretch
 *  pas le contenu de chaque cellule à la largeur de sa colonne (son wrapper
 *  interne n'est pas `alignItems: stretch`). Sans largeur explicite, une
 *  tuile ne prend que la taille de son contenu (icône + texte + padding),
 *  d'où le rendu "tassé" constaté. Il faut donc quand même calculer une
 *  taille de tuile en JS — mais, contrairement au `ScrollView` + `flex-wrap`
 *  précédent, `numColumns` décide seul du nombre de colonnes : la taille de
 *  la tuile n'influence plus le wrap, donc plus besoin de marge asymétrique
 *  (`lastInRow`) — une marge uniforme suffit. */
export function computeTileSize(width: number): number {
  const contentPadding = GRID_PADDING - TILE_MARGIN;
  const slotWidth = Math.floor((width - contentPadding * 2) / NUM_COLUMNS);
  return slotWidth - TILE_MARGIN * 2;
}

export { NUM_COLUMNS, TILE_MARGIN, GRID_PADDING };
