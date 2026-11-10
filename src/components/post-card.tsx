import { useCallback } from 'react';
import { Alert, Pressable, useColorScheme, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { FolderMinus, Trash2 } from 'lucide-react-native';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { removePostFromCollection, softDeletePost, type PostListItem } from '@/db/posts';
import { detectPlatform, PLATFORM_META, type Platform } from '@/lib/share-url';
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

/** TikTok et Reels Instagram sont des vidéos verticales 9:16. */
function isVerticalVideo(url: string | null, platform: Platform | null): boolean {
  if (!url || !platform) return false;
  if (platform === 'tiktok') return true;
  if (platform === 'instagram' && url.includes('/reel/')) return true;
  return false;
}

/** Badge plateforme avec le style sticker (rotation, bordure, ombre). */
function PlatformSticker({ platform, small }: { platform: Platform; small?: boolean }) {
  const meta = PLATFORM_META[platform];
  const size = small ? 24 : 38;
  const borderRadius = small ? 7 : 11;
  const borderWidth = small ? 2 : 3;
  const fontSize = small ? 8.5 : 12.5;

  return (
    <View
      style={{
        position: 'absolute',
        right: -7,
        bottom: -7,
        width: size,
        height: size,
        borderRadius,
        borderWidth,
        borderColor: '#fff',
        backgroundColor: meta.color,
        transform: [{ rotate: '-7deg' }],
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.28,
        shadowRadius: 6,
        elevation: 8,
      }}>
      <Text style={{ color: '#fff', fontSize, fontWeight: '800', letterSpacing: -0.3 }}>
        {meta.badge}
      </Text>
    </View>
  );
}

/** Fallback papier pour les posts sans thumbnail (texte seul). */
function PaperThumbnail({ text, isDark }: { text: string; isDark: boolean }) {
  return (
    <View
      className="items-start justify-start overflow-hidden rounded-[10px] border p-2"
      style={{
        width: 64,
        aspectRatio: 1,
        backgroundColor: isDark ? '#282c35' : '#fff',
        borderColor: isDark ? '#3e424d' : '#e6e8ec',
      }}>
      <Text
        className="text-[9.5px] font-semibold leading-[1.35]"
        style={{ color: isDark ? '#e0e2e6' : '#26282e' }}
        numberOfLines={6}>
        {text}
      </Text>
    </View>
  );
}

export function PostCard({ item, collectionId }: { item: PostListItem; collectionId?: string }) {
  const isDark = useColorScheme() === 'dark';
  const colors = THEME[isDark ? 'dark' : 'light'];
  const platform = item.url ? detectPlatform(item.url) : null;
  const meta = platform ? PLATFORM_META[platform] : null;
  const isVertical = isVerticalVideo(item.url, platform);
  const displayText = item.caption || item.note || '';

  // Couleurs adaptées au thème
  // Dark: fond app ~#0a0a0a, donc carte plus claire pour contraste
  const cardBg = isDark ? '#1f2128' : '#f2f2f5';
  const chipBg = isDark ? '#363a45' : '#e6e7eb';
  const chipText = isDark ? '#b0b5be' : '#4a4d55';
  const dateText = isDark ? '#8b919c' : '#8a8d96';
  const captionText = isDark ? '#eaecef' : '#111214';

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
          className="flex-row items-start gap-3 rounded-[18px] p-2.5"
          style={({ pressed }) => [
            { backgroundColor: cardBg },
            pressed && { transform: [{ scale: 0.98 }] },
          ]}>
          {/* Thumbnail avec sticker plateforme */}
          <View style={{ position: 'relative' }}>
            {item.thumbnailUrl ? (
              <Image
                source={{ uri: item.thumbnailUrl }}
                style={{
                  width: isVertical ? 52 : 64,
                  aspectRatio: isVertical ? 9 / 16 : 1,
                  borderRadius: 10,
                }}
                contentFit="cover"
                transition={200}
              />
            ) : (
              <PaperThumbnail text={displayText} isDark={isDark} />
            )}
            {platform && <PlatformSticker platform={platform} small />}
          </View>

          {/* Texte */}
          <View className="flex-1 gap-1.5 pt-0.5">
            {!!displayText && (
              <Text
                className="text-[13px] font-medium leading-[1.32]"
                style={{ color: captionText }}
                numberOfLines={2}>
                {displayText}
              </Text>
            )}
            <View className="flex-row flex-wrap items-center gap-1.5">
              {item.collectionNames.length > 0 ? (
                <>
                  <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: chipBg }}>
                    <Text className="text-[11px]" style={{ color: chipText }}>{item.collectionNames[0]}</Text>
                  </View>
                  {item.collectionNames.length > 1 && (
                    <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: chipBg }}>
                      <Text className="text-[11px]" style={{ color: chipText }}>+{item.collectionNames.length - 1}</Text>
                    </View>
                  )}
                </>
              ) : (
                <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: chipBg }}>
                  <Text className="text-[11px]" style={{ color: chipText }}>No collection</Text>
                </View>
              )}
              <Text className="ml-auto text-[11px]" style={{ color: dateText }}>
                {dateFormatter.format(item.updatedAt)}
              </Text>
            </View>
          </View>
        </Pressable>
      </Swipeable>
    </Animated.View>
  );
}
