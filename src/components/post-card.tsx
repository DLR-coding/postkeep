import { useCallback } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { FolderMinus, Trash2 } from 'lucide-react-native';

import { HighlightedText, PostThumb } from '@/components/post-thumb';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { removePostFromCollection, softDeletePost, type PostListItem } from '@/db/posts';
import { detectPlatform, PLATFORM_META } from '@/lib/share-url';
import { usePostDetailStore } from '@/stores/post-detail-store';

const dateFormatter = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' });

const THUMB_WIDTH = 80;

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
      className={`ml-2 w-20 items-center justify-center rounded-2xl ${colorClassName}`}
      accessibilityLabel={accessibilityLabel}>
      <Icon as={icon} className="text-white" size={20} />
    </Pressable>
  );
}

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

  const handleRemoveFromCollection = useCallback(() => {
    if (!collectionId) return;
    Alert.alert('Remove this post from the collection?', 'It stays in "All posts".', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          removePostFromCollection(item.id, collectionId);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
      },
    ]);
  }, [item.id, collectionId]);

  const handleDelete = useCallback(() => {
    Alert.alert('Delete this post?', 'It will disappear from PostKeep.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          softDeletePost(item.id);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
      },
    ]);
  }, [item.id]);

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(150)}
      layout={LinearTransition}>
      <Swipeable
        renderRightActions={() => (
          <View className="flex-row py-3">
            {collectionId && (
              <SwipeAction
                onPress={handleRemoveFromCollection}
                icon={FolderMinus}
                colorClassName="bg-amber-500"
                accessibilityLabel="Remove from collection"
              />
            )}
            <SwipeAction
              onPress={handleDelete}
              icon={Trash2}
              colorClassName="bg-destructive"
              accessibilityLabel="Delete"
            />
          </View>
        )}
        overshootRight={false}>
        <Pressable
          onPress={() => usePostDetailStore.getState().open(item.id)}
          className="flex-row gap-3.5 border-b border-border bg-background px-4 py-3"
          style={({ pressed }) => (pressed ? { opacity: 0.7 } : undefined)}>
          <PostThumb post={item} width={THUMB_WIDTH} highlightQuery={highlightQuery} />

          <View className="min-w-0 flex-1 gap-1.5">
            <Text variant="muted" className="text-[11px]">
              {platformLabel} · {dateFormatter.format(item.updatedAt)}
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
              <View className="rounded-lg bg-note px-2 py-1.5">
                <HighlightedText
                  text={`Note  ${item.note}`}
                  query={highlightQuery}
                  numberOfLines={3}
                  className="text-xs leading-[1.35] text-note-foreground"
                />
              </View>
            )}
            <View className="flex-row flex-wrap gap-1">
              {(item.collectionNames.length > 0 ? item.collectionNames : ['No collection']).map(
                (name) => (
                  <View key={name} className="rounded-full bg-chip px-2 py-0.5">
                    <Text className="text-[11px] text-chip-foreground">{name}</Text>
                  </View>
                )
              )}
            </View>
          </View>
        </Pressable>
      </Swipeable>
    </Animated.View>
  );
}
