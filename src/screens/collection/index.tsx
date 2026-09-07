import { useMemo } from 'react';
import { View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';

import { Text } from '@/components/ui/text';
import { PostCard } from '@/components/post-card';
import { collectionPostsQuery, groupPostRows, uncategorizedPostsQuery, type PostListItem } from '@/db/posts';

const UNCATEGORIZED_ID = 'none';

export function CollectionScreen() {
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
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <PostCard item={item} collectionId={isUncategorized ? undefined : id} />}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center px-8 py-16">
            <Text variant="muted" className="text-center">
              No posts here yet.
            </Text>
          </View>
        }
        contentContainerStyle={isEmpty ? { flexGrow: 1 } : { padding: 16 }}
      />
    </View>
  );
}
