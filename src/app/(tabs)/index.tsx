import { useMemo } from 'react';
import { useColorScheme, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { Bookmark } from 'lucide-react-native';
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
  const { data: rows } = useLiveQuery(activePostsQuery());
  const posts = useMemo(() => groupPostRows(rows), [rows]);
  const isEmpty = posts.length === 0;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <Text className="px-5 pb-2 pt-4 text-3xl font-bold">Tous les posts</Text>
      <FlashList<PostListItem>
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <PostCard item={item} />}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListEmptyComponent={EmptyState}
        contentContainerStyle={isEmpty ? { flexGrow: 1 } : { padding: 16 }}
      />
    </SafeAreaView>
  );
}
