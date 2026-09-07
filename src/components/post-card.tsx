import { useCallback } from 'react';
import { Alert, Pressable, useColorScheme, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { FolderMinus, Trash2 } from 'lucide-react-native';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { removePostFromCollection, softDeletePost, type PostListItem } from '@/db/posts';
import { detectPlatform, PLATFORM_META } from '@/lib/share-url';
import { THEME } from '@/lib/theme';
import { usePostDetailStore } from '@/stores/post-detail-store';

const dateFormatter = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' });

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

/** `collectionId` : présent quand la carte est affichée dans une vue collection
 *  (`src/screens/collection/index.tsx`) plutôt que « Tous les posts » — ajoute un
 *  bouton de balayage « Retirer de la collection » (soft-delete de la ligne
 *  `post_collections` uniquement) à côté du « Supprimer » habituel, qui reste une
 *  suppression réelle du post dans tous les cas (ARCHITECTURE.md §4 « Deux
 *  niveaux de suppression »). Absent depuis le pseudo-dossier « Sans collection »
 *  (rien à retirer, il n'y a pas de ligne `post_collections` réelle) : seul
 *  « Supprimer » y est affiché. */
export function PostCard({ item, collectionId }: { item: PostListItem; collectionId?: string }) {
  const colors = THEME[useColorScheme() === 'dark' ? 'dark' : 'light'];
  const platform = item.url ? detectPlatform(item.url) : null;
  const meta = platform ? PLATFORM_META[platform] : null;

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
    // ponytail: `exiting`/`layout` sur une cellule FlashList (vues recyclées) —
    // l'apparition (entering) est garantie, la sortie animée au balayage dépend
    // du recyclage de la vue et n'est pas garantie sur toutes les plateformes.
    // À confirmer sur appareil ; sans effet visible, retirer `exiting`/`layout`.
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(150)}
      layout={LinearTransition}>
      <Swipeable
        renderRightActions={() => (
          <View className="flex-row">
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
          className="flex-row gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm shadow-black/5"
          style={({ pressed }) => (pressed ? { transform: [{ scale: 0.98 }] } : undefined)}>
          <View
            className="h-11 w-11 items-center justify-center rounded-full shadow-sm shadow-black/10"
            style={{ backgroundColor: meta?.color ?? colors.muted }}>
            <Text className="text-sm font-bold" style={{ color: meta ? '#fff' : colors.mutedForeground }}>
              {meta?.badge ?? '?'}
            </Text>
          </View>

          <View className="flex-1 gap-1.5">
            <View className="flex-row items-center justify-between gap-2">
              <Text className="font-semibold">{meta?.label ?? 'Texte'}</Text>
              <Text variant="muted" className="text-xs">
                {dateFormatter.format(item.updatedAt)}
              </Text>
            </View>
            {!!item.note && (
              <Text className="text-sm leading-5" numberOfLines={2}>
                {item.note}
              </Text>
            )}
            {item.collectionNames.length > 0 && (
              <View className="flex-row flex-wrap gap-1.5 pt-0.5">
                {item.collectionNames.slice(0, 3).map((name) => (
                  <View key={name} className="rounded-full bg-muted px-2 py-0.5">
                    <Text variant="muted" className="text-xs">
                      {name}
                    </Text>
                  </View>
                ))}
                {item.collectionNames.length > 3 && (
                  <View className="rounded-full bg-muted px-2 py-0.5">
                    <Text variant="muted" className="text-xs">
                      +{item.collectionNames.length - 3}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </Pressable>
      </Swipeable>
    </Animated.View>
  );
}
