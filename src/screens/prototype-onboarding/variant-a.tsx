// PROTOTYPE — Variante A « Carousel » : 4 pages qu'on fait défiler, points, bouton Next.
/* eslint-disable react/no-unescaped-entities -- prototype jetable */
import { useEffect, useRef, useState } from 'react';
import { ScrollView, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PlatformSticker } from '@/components/platform-sticker';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';

import {
  AccountFields,
  FakeShareSheet,
  FlowDone,
  openShareMenu,
  PLATFORMS,
  PlatformRow,
  SavedBadge,
  WaitingForPost,
  type VariantProps,
} from './shared';

const PAGES = ['Welcome', 'Pin PostKeep', 'Save first post', 'Account'];

export function VariantA({ onStep }: VariantProps) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const scroll = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const [page, setPage] = useState(0);
  const [save, setSave] = useState<'idle' | 'waiting' | 'saved'>('idle');
  const [done, setDone] = useState(false);

  useEffect(() => onStep(done ? 'done' : `${PAGES[page]}${page === 2 ? ` (${save})` : ''}`), [page, save, done, onStep]);

  const goTo = (i: number) => {
    scroll.current?.scrollTo({ x: i * width, animated: true });
    setPage(i);
  };

  if (done)
    return (
      <FlowDone
        onRestart={() => {
          setDone(false);
          setSave('idle');
          setPage(0);
        }}
      />
    );

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <View className="h-12 flex-row items-center justify-end px-4">
        {page < 3 && (
          <Button variant="ghost" size="sm" onPress={() => goTo(3)}>
            <Text>Skip</Text>
          </Button>
        )}
      </View>
      <ScrollView
        ref={scroll}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}>
        <Page width={width} title="All your saved posts, in one place">
          <View className="flex-row" style={{ gap: 10 }}>
            {PLATFORMS.map((p) => (
              <PlatformSticker key={p} platform={p} size="md" />
            ))}
          </View>
          <Text variant="muted" className="text-center text-base">
            Keep posts from Instagram, TikTok, X, Threads and Reddit. Sort them into collections, add notes, find
            them with search.
          </Text>
        </Page>
        <Page width={width} title="First, pin PostKeep">
          <FakeShareSheet showPin />
          <Text variant="muted" className="text-center text-base">
            PostKeep lives in your share menu. Pin it so it's always the first app there.
          </Text>
          <Button variant="outline" onPress={openShareMenu}>
            <Text>Open the share menu</Text>
          </Button>
        </Page>
        <Page width={width} title={save === 'saved' ? 'You saved your first post' : 'Now save a post'}>
          {save === 'saved' ? (
            <SavedBadge />
          ) : (
            <>
              <Text variant="muted" className="text-center text-base">
                Open an app, find a post, tap Share, then PostKeep, then Save. You'll come right back here.
              </Text>
              <PlatformRow onPick={() => setSave('waiting')} />
              {save === 'waiting' && <WaitingForPost onArrived={() => setSave('saved')} />}
            </>
          )}
        </Page>
        <Page width={width} title="Create your account">
          <Text variant="muted" className="text-center text-base">
            Your account backs up your posts and syncs them across your phones. You need one to start saving.
          </Text>
          <AccountFields onDone={() => setDone(true)} />
        </Page>
      </ScrollView>
      <View className="items-center px-6" style={{ gap: 16, paddingBottom: insets.bottom + 96 }}>
        <View className="flex-row" style={{ gap: 8 }}>
          {PAGES.map((p, i) => (
            <View key={p} className={i === page ? 'h-2 w-6 rounded-full bg-foreground' : 'h-2 w-2 rounded-full bg-border'} />
          ))}
        </View>
        {page < 3 && (
          <Button className="h-12 w-full rounded-2xl" onPress={() => goTo(page + 1)}>
            <Text className="font-semibold">{page === 2 && save !== 'saved' ? "I'll do it later" : 'Next'}</Text>
          </Button>
        )}
      </View>
    </View>
  );
}

function Page({ width, title, children }: { width: number; title: string; children: React.ReactNode }) {
  return (
    <ScrollView style={{ width }} contentContainerClassName="flex-grow items-center justify-center px-8" contentContainerStyle={{ gap: 20 }} keyboardShouldPersistTaps="handled">
      <Text className="text-center text-3xl font-bold">{title}</Text>
      {children}
    </ScrollView>
  );
}
