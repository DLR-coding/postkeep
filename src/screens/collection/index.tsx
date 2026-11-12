import { useMemo } from 'react';
import { View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import { ScrollView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';

import { Text } from '@/components/ui/text';
import { PostCard } from '@/components/post-card';
import { collectionPostsQuery, groupPostRows, uncategorizedPostsQuery, type PostListItem } from '@/db/posts';

const UNCATEGORIZED_ID = 'none';

export function CollectionScreen() {
  const insets = useSafeAreaInsets();
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const isUncategorized = id === UNCATEGORIZED_ID;
  const query = isUncategorized ? uncategorizedPostsQuery() : collectionPostsQuery(id);
  const { data: rows } = useLiveQuery(query);
  const posts = useMemo(() => groupPostRows(rows), [rows]);
  const isEmpty = posts.length === 0;

  return (
    <View className="flex-1 bg-background">
      <Stack.Title>{name ?? 'Collection'}</Stack.Title>
      <FlashList<PostListItem>
        // Défilement géré par gesture-handler : sinon le balayage d'une carte (PostCard)
        // prend la main dès 10 dp horizontaux et bloque le défilement en diagonale.
        renderScrollComponent={ScrollView}
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <PostCard item={item} collectionId={isUncategorized ? undefined : id} />}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center px-8 py-16">
            <Text variant="muted" className="text-center">
              No posts here yet.
            </Text>
          </View>
        }
        // Dernière ligne au-dessus de la barre de navigation Android (edge-to-edge).
        contentContainerStyle={isEmpty ? { flexGrow: 1 } : { paddingBottom: insets.bottom + 16 }}
      />
    </View>
  );
}
