import { useMemo, useRef, useState } from 'react';
import { Pressable, useColorScheme, useWindowDimensions, View } from 'react-native';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { Bookmark, LayoutGrid, List, Settings } from 'lucide-react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { PlatformFilterPills } from '@/components/platform-filter-pills';
import { PostCard } from '@/components/post-card';
import { GRID_COLUMNS, GRID_GAP, GRID_SIDE, gridCellWidth, PostGridCell } from '@/components/post-grid-cell';
import { SettingsSheet } from '@/components/settings-sheet';
import { TAB_BAR_CLEARANCE } from '@/components/glass-tab-bar';
import { activePostsQuery, groupPostRows, type PostListItem } from '@/db/posts';
import { filterPosts, type PlatformFilter } from '@/lib/post-filters';
import { loadPostsLayout, savePostsLayout } from '@/lib/settings';
import type { PostsLayout } from '@/lib/settings-logic';
import { THEME } from '@/lib/theme';
import { useNavSearchStore } from '@/stores/nav-search-store';

const FILTER_LABEL: Record<PlatformFilter, string> = {
  all: '',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  x: 'X',
  reddit: 'Reddit',
};

function EmptyState() {
  const colors = THEME[useColorScheme() === 'dark' ? 'dark' : 'light'];
  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      className="flex-1 items-center justify-center gap-4 px-8">
      <View className="h-20 w-20 items-center justify-center rounded-full bg-muted">
        <Icon as={Bookmark} size={32} color={colors.mutedForeground} />
      </View>
      <Text className="text-center text-xl font-semibold">Nothing to show yet</Text>
      <Text variant="muted" className="text-center">
        Share a post from Instagram, TikTok, X or Threads to find it here.
      </Text>
    </Animated.View>
  );
}

export default function HomeScreen() {
  const colors = THEME[useColorScheme() === 'dark' ? 'dark' : 'light'];
  const settingsRef = useRef<BottomSheetModal>(null);
  const insets = useSafeAreaInsets();
  const { data: rows } = useLiveQuery(activePostsQuery());
  const posts = useMemo(() => groupPostRows(rows), [rows]);

  const [platform, setPlatform] = useState<PlatformFilter>('all');
  const query = useNavSearchStore((s) => s.query).trim();
  const filteredPosts = useMemo(() => filterPosts(posts, { platform, query }), [posts, platform, query]);
  const isEmpty = filteredPosts.length === 0;
  const filtering = platform !== 'all' || !!query;

  // Liste ou grille, mémorisé sur l'appareil (magasin clé-valeur d'expo-sqlite).
  const [layout, setLayout] = useState<PostsLayout>(loadPostsLayout);
  const toggleLayout = () => {
    const next = layout === 'list' ? 'grid' : 'list';
    setLayout(next);
    savePostsLayout(next);
  };
  const { width: screenWidth } = useWindowDimensions();
  const cellWidth = gridCellWidth(screenWidth);

  const count = filteredPosts.length;
  const countLine = query
    ? `${count} result${count === 1 ? '' : 's'} for “${query}”${platform !== 'all' ? ` in ${FILTER_LABEL[platform]}` : ''}`
    : `${count} ${FILTER_LABEL[platform]} post${count === 1 ? '' : 's'}`;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-row items-center justify-between px-5 pb-3 pt-4">
        <Text className="flex-1 text-3xl font-bold" numberOfLines={1}>
          All posts
        </Text>
        <Pressable
          onPress={toggleLayout}
          accessibilityLabel={layout === 'list' ? 'Show as grid' : 'Show as list'}
          hitSlop={8}
          className="mr-2 h-10 w-10 items-center justify-center rounded-full bg-pill active:scale-95">
          <Icon as={layout === 'list' ? LayoutGrid : List} size={20} color={colors.foreground} />
        </Pressable>
        <Pressable
          onPress={() => settingsRef.current?.present()}
          accessibilityLabel="Settings"
          hitSlop={8}
          className="h-10 w-10 items-center justify-center rounded-full bg-pill active:scale-95">
          <Icon as={Settings} size={20} color={colors.foreground} />
        </Pressable>
      </View>
      {posts.length > 0 && <PlatformFilterPills value={platform} onChange={setPlatform} />}
      {posts.length > 0 && filtering && (
        <Text variant="muted" className="px-5 pb-1 pt-1 text-xs">
          {countLine}
        </Text>
      )}

      <FlashList<PostListItem>
        // Glisser la liste ferme le clavier : sans ça, pendant une recherche, les
        // derniers résultats restent sous le clavier et la barre (edge-to-edge).
        keyboardDismissMode="on-drag"
        // Premier appui sur une ligne : ouvre le post, sans seulement fermer le clavier.
        keyboardShouldPersistTaps="handled"
        // Changer le nombre de colonnes demande de remonter la liste (FlashList).
        key={layout}
        numColumns={layout === 'grid' ? GRID_COLUMNS : 1}
        data={filteredPosts}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) =>
          layout === 'grid' ? (
            <View
              style={{
                marginLeft: index % GRID_COLUMNS === 0 ? 0 : GRID_GAP,
                marginBottom: GRID_GAP,
              }}>
              <PostGridCell item={item} width={cellWidth} highlightQuery={query} />
            </View>
          ) : (
            <PostCard item={item} highlightQuery={query} />
          )
        }
        ListEmptyComponent={
          posts.length > 0 && filtering ? (
            <View className="flex-1 items-center justify-center px-8 py-16">
              <Text variant="muted" className="text-center">
                No matching post.
              </Text>
            </View>
          ) : (
            EmptyState
          )
        }
        contentContainerStyle={
          isEmpty
            ? { flexGrow: 1 }
            : {
                paddingBottom: TAB_BAR_CLEARANCE + insets.bottom + 16,
                paddingHorizontal: layout === 'grid' ? GRID_SIDE : 0,
                paddingTop: layout === 'grid' ? 4 : 0,
              }
        }
      />
      <SettingsSheet sheetRef={settingsRef} />
    </SafeAreaView>
  );
}
