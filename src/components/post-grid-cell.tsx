import { Pressable, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { HighlightedText, PostThumb } from '@/components/post-thumb';
import type { PostListItem } from '@/db/posts';
import { usePostDetailStore } from '@/stores/post-detail-store';

/** Écart entre les cellules de la grille (maquette « Grille 3 colonnes »). */
export const GRID_GAP = 4;
export const GRID_COLUMNS = 3;
/** Marge latérale de la grille : plus serrée que la liste, comme sur la maquette. */
export const GRID_SIDE = 8;

export function gridCellWidth(screenWidth: number): number {
  return Math.floor((screenWidth - GRID_SIDE * 2 - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS);
}

/** Cellule de la vue grille : vignette 9:16, autocollant en haut à droite, légende en
 *  blanc sur un dégradé sombre en bas de l'image. Sans miniature, la vignette de secours
 *  montre déjà le texte : pas de calque. Toucher ouvre la feuille de détail (suppression
 *  et édition y sont). */
export function PostGridCell({
  item,
  width,
  highlightQuery,
}: {
  item: PostListItem;
  width: number;
  highlightQuery?: string;
}) {
  const text = item.caption ?? item.note;
  const height = Math.round((width * 16) / 9);
  return (
    <Pressable
      onPress={() => usePostDetailStore.getState().open(item.id)}
      accessibilityLabel={text ?? 'Post'}
      style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}>
      <PostThumb post={item} width={width} highlightQuery={highlightQuery} stickerAt="top-right" radius={12}>
        {!!text && (
          <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: height * 0.45 }}>
            <Svg width="100%" height="100%" style={{ position: 'absolute' }}>
              <Defs>
                <LinearGradient id="grid-fade" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor="#000" stopOpacity="0" />
                  <Stop offset="1" stopColor="#000" stopOpacity="0.6" />
                </LinearGradient>
              </Defs>
              <Rect width="100%" height="100%" fill="url(#grid-fade)" />
            </Svg>
            <HighlightedText
              text={text}
              query={highlightQuery}
              numberOfLines={2}
              style={{
                position: 'absolute',
                left: 6,
                right: 6,
                bottom: 6,
                color: '#fff',
                fontSize: 10.5,
                lineHeight: 13,
                fontWeight: '600',
              }}
            />
          </View>
        )}
      </PostThumb>
    </Pressable>
  );
}
