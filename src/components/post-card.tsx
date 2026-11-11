import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import * as Haptics from 'expo-haptics';
import { FolderMinus, Trash2 } from 'lucide-react-native';

import { CollectionChip } from '@/components/collection-chip';
import { HighlightedText, PostThumb } from '@/components/post-thumb';
import { ConfirmDialog } from '@/components/sheet-kit';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { RADIUS, SPACE } from '@/lib/design';
import { formatPostDate } from '@/lib/format-date';
import { removePostFromCollection, softDeletePost, type PostListItem } from '@/db/posts';
import { detectPlatform, PLATFORM_META } from '@/lib/share-url';
import { usePostDetailStore } from '@/stores/post-detail-store';

const THUMB_WIDTH = 80;
const CARD_PADDING = SPACE.md;

function SwipeAction({
  onPress,
  icon,
  colorClassName,
  accessibilityLabel,
}: {
  onPress: () => void;
  icon: typeof Trash2;
  colorClassName: string;
  accessibilityLabel: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`ml-2 w-20 items-center justify-center ${colorClassName}`}
      style={{ borderRadius: RADIUS.card, borderCurve: 'continuous' }}
      accessibilityLabel={accessibilityLabel}>
      <Icon as={icon} className="text-white" size={20} />
    </Pressable>
  );
}

// Au-delà, « +N » : une ligne de la liste ne doit pas grandir avec le nombre de collections
// (le détail du post les montre toutes).
const MAX_CHIPS = 3;

/** Ligne « Fiche » de la refonte (spec, objectif 2) : vignette 9:16 à gauche, à droite
 *  « Plateforme · date », légende, note, puces de collection. `collectionId` : présent
 *  dans une vue collection, ajoute le balayage « Retirer de la collection »
 *  (ARCHITECTURE.md §4, deux niveaux de suppression). `highlightQuery` : terme de la
 *  recherche à surligner. */
export function PostCard({
  item,
  collectionId,
  highlightQuery,
}: {
  item: PostListItem;
  collectionId?: string;
  highlightQuery?: string;
}) {
  const platform = item.url ? detectPlatform(item.url) : null;
  const platformLabel = platform ? PLATFORM_META[platform].label : 'Text';

  const [confirm, setConfirm] = useState<'delete' | 'remove' | null>(null);

  // Fondu de sortie à la suppression, piloté à la main (pas d'animation `exiting`) : la
  // ligne s'efface, puis la suppression part. FlashList réutilise ensuite cette ligne pour
  // un autre post → l'opacité revient à 1 à chaque changement de post.
  const opacity = useSharedValue(1);
  useEffect(() => {
    opacity.set(1);
  }, [item.id, opacity]);
  const fadeStyle = useAnimatedStyle(() => ({ opacity: opacity.get() }));
  const fadeOutThen = (action: () => void) => {
    opacity.set(
      withTiming(0, { duration: 180 }, (finished) => {
        if (finished) scheduleOnRN(action);
      })
    );
  };

  return (
    // Pas d'animation Reanimated `entering` / `exiting` / `layout` sur la ligne : FlashList
    // recycle les lignes, et l'animation faisait glisser chaque ligne réutilisée vers sa
    // nouvelle taille pendant le défilement (cartes qui « se déplacent », vu sur appareil).
    // Cartes séparées (maquette 2e tour, variante 1 « Liste au vrai format », mise à
    // l'échelle d'un écran de 282 px à ~360 dp) : marge latérale 20, 12 entre cartes.
    <Animated.View style={[{ paddingHorizontal: SPACE.lg + SPACE.xs, paddingBottom: SPACE.md }, fadeStyle]}>
      <Swipeable
        renderRightActions={() => (
          <View className="flex-row">
            {collectionId && (
              <SwipeAction
                onPress={() => setConfirm('remove')}
                icon={FolderMinus}
                colorClassName="bg-amber-500"
                accessibilityLabel="Remove from collection"
              />
            )}
            <SwipeAction
              onPress={() => setConfirm('delete')}
              icon={Trash2}
              colorClassName="bg-destructive"
              accessibilityLabel="Delete"
            />
          </View>
        )}
        overshootRight={false}
        // La carte glisse jusque dans la marge latérale au lieu d'être coupée net à gauche.
        containerStyle={{ overflow: 'visible' }}>
        <Pressable
          onPress={() => usePostDetailStore.getState().open(item.id)}
          // Style objet et non fonction : avec `className`, NativeWind ignorait le style
          // fonction (carte sans marge ni coins arrondis, vu sur appareil).
          className="flex-row gap-3.5 bg-surface active:opacity-70"
          style={{ padding: CARD_PADDING, borderRadius: RADIUS.card, borderCurve: 'continuous' }}>
          {/* Rayon concentrique à celui de la carte (rayon de la carte − marge intérieure). */}
          <PostThumb
            post={item}
            width={THUMB_WIDTH}
            radius={RADIUS.card - CARD_PADDING}
            highlightQuery={highlightQuery}
          />

          <View className="min-w-0 flex-1 gap-1.5">
            <Text variant="muted" className="text-[11px]">
              {platformLabel} · {formatPostDate(item.createdAt)}
            </Text>
            {!!item.caption && (
              <HighlightedText
                text={item.caption}
                query={highlightQuery}
                numberOfLines={3}
                className="text-sm font-semibold leading-[1.3]"
              />
            )}
            {!!item.note && (
              <View className="flex-row gap-1.5 bg-background px-2.5 py-2" style={{ borderRadius: RADIUS.inset }}>
                <Text className="text-xs font-semibold text-note-foreground">Note</Text>
                <HighlightedText
                  text={item.note}
                  query={highlightQuery}
                  numberOfLines={3}
                  className="flex-1 text-xs leading-[1.35] text-note-foreground"
                />
              </View>
            )}
            <View className="flex-row flex-wrap gap-1">
              {item.collectionNames.length > 0 ? (
                <>
                  {item.collectionNames.slice(0, MAX_CHIPS).map((name) => (
                    <CollectionChip key={name} name={name} />
                  ))}
                  {item.collectionNames.length > MAX_CHIPS && (
                    <CollectionChip name={null} label={`+${item.collectionNames.length - MAX_CHIPS}`} />
                  )}
                </>
              ) : (
                <CollectionChip name={null} />
              )}
            </View>
          </View>
        </Pressable>
      </Swipeable>
      {confirm && (
        <ConfirmDialog
          open
          onOpenChange={(open) => !open && setConfirm(null)}
          title={confirm === 'delete' ? 'Delete this post?' : 'Remove from this collection?'}
          description={confirm === 'delete' ? 'It will disappear from PostKeep.' : 'It stays in "All posts".'}
          confirmLabel={confirm === 'delete' ? 'Delete' : 'Remove'}
          onConfirm={() => {
            const kind = confirm;
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            fadeOutThen(() => {
              if (kind === 'delete') softDeletePost(item.id);
              else if (collectionId) removePostFromCollection(item.id, collectionId);
            });
          }}
        />
      )}
    </Animated.View>
  );
}
