import { useMemo, useState } from 'react';
import { Pressable, TextInput, useColorScheme, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { Bookmark, Search, X } from 'lucide-react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { PostCard } from '@/components/post-card';
import { activePostsQuery, groupPostRows, type PostListItem } from '@/db/posts';
import { THEME } from '@/lib/theme';

function EmptyState() {
  const colors = THEME[useColorScheme() === 'dark' ? 'dark' : 'light'];
  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      className="flex-1 items-center justify-center gap-4 px-8">
      <View className="h-20 w-20 items-center justify-center rounded-full bg-muted">
        <Icon as={Bookmark} size={32} color={colors.mutedForeground} />
      </View>
      <Text className="text-center text-xl font-semibold">Rien à afficher pour l&apos;instant</Text>
      <Text variant="muted" className="text-center">
        Partagez un post depuis Instagram, TikTok, X ou Threads pour le retrouver ici.
      </Text>
    </Animated.View>
  );
}

export default function HomeScreen() {
  const colors = THEME[useColorScheme() === 'dark' ? 'dark' : 'light'];
  const { data: rows } = useLiveQuery(activePostsQuery());
  const posts = useMemo(() => groupPostRows(rows), [rows]);

  const [query, setQuery] = useState('');
  const normalizedQuery = query.trim().toLowerCase();
  const filteredPosts = normalizedQuery
    ? posts.filter(
        (post) =>
          post.note?.toLowerCase().includes(normalizedQuery) ||
          post.url?.toLowerCase().includes(normalizedQuery)
      )
    : posts;
  const nothingFound = !!normalizedQuery && filteredPosts.length === 0;
  const isEmpty = filteredPosts.length === 0;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <Text className="px-5 pb-2 pt-4 text-3xl font-bold">Tous les posts</Text>

      {posts.length > 0 && (
        <View className="mx-5 mb-3 flex-row items-center gap-2 rounded-xl border border-border bg-card px-3">
          <Icon as={Search} size={18} color={colors.mutedForeground} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Rechercher une note ou une URL…"
            placeholderTextColor={colors.mutedForeground}
            className="flex-1 py-2.5 text-base text-foreground"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} hitSlop={8} accessibilityLabel="Effacer la recherche">
              <Icon as={X} size={16} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>
      )}

      <FlashList<PostListItem>
        data={filteredPosts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <PostCard item={item} />}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListEmptyComponent={
          nothingFound ? (
            <View className="flex-1 items-center justify-center px-8 py-16">
              <Text variant="muted" className="text-center">
                Aucun post ne correspond.
              </Text>
            </View>
          ) : (
            EmptyState
          )
        }
        contentContainerStyle={isEmpty ? { flexGrow: 1 } : { padding: 16 }}
      />
    </SafeAreaView>
  );
}
