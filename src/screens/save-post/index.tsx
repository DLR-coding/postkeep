import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, useColorScheme, View } from 'react-native';
import { useShareIntentContext } from 'expo-share-intent';
import { useRouter } from 'expo-router';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { findPostByUrl, findPostCollectionIds } from '@/db/posts';
import { analyzeSharedUrl, type AnalyzedUrl } from '@/lib/share-url';
import { THEME } from '@/lib/theme';

import { SavePostForm } from './form';

export type Prefill = {
  postId?: string;
  note: string;
  collectionIds: string[];
};

export function SavePost() {
  const router = useRouter();
  const { shareIntent, hasShareIntent, resetShareIntent, error, isReady } =
    useShareIntentContext();
  const colors = THEME[useColorScheme() === 'dark' ? 'dark' : 'light'];

  const analyzed: AnalyzedUrl | null = useMemo(
    () => analyzeSharedUrl(shareIntent.webUrl),
    [shareIntent.webUrl]
  );
  const [prefill, setPrefill] = useState<Prefill | null>(null);

  useEffect(() => {
    if (isReady && !hasShareIntent) {
      router.replace('/');
    }
  }, [isReady, hasShareIntent, router]);

  useEffect(() => {
    if (!isReady || !hasShareIntent) return;
    let cancelled = false;
    (async () => {
      const existing = analyzed ? await findPostByUrl(analyzed.url) : null;
      const collectionIds = existing ? await findPostCollectionIds(existing.id) : [];
      if (cancelled) return;
      setPrefill({
        postId: existing?.id,
        note: existing?.note ?? (analyzed ? '' : (shareIntent.text ?? '')),
        collectionIds,
      });
    })();
    return () => {
      cancelled = true;
    };
    // `analyzed` est recalculé à chaque frame (nouvel objet) — on ne dépend que
    // de l'URL normalisée qu'il contient.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, hasShareIntent, analyzed?.url, shareIntent.text]);

  if (!isReady || (hasShareIntent && !prefill)) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color={colors.foreground} />
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center gap-3 bg-background p-6">
        <Text className="text-destructive">{error}</Text>
        <Button
          onPress={() => {
            resetShareIntent();
            router.replace('/');
          }}>
          <Text>Back</Text>
        </Button>
      </View>
    );
  }

  if (!hasShareIntent || !prefill) {
    // Redirection vers `/` déjà déclenchée par l'effet ci-dessus.
    return null;
  }

  return <SavePostForm analyzed={analyzed} prefill={prefill} />;
}
