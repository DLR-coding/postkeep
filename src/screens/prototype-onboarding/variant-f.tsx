// PROTOTYPE — Variante F « Carousel → coach → compte » (choix du 14 novembre) : intro en
// carousel plein écran (A), puis l'accueil avec la carte coach (E) pour épingler et
// enregistrer le premier post, puis le compte obligatoire en dernier.
import { FolderOpen, Search, StickyNote } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PlatformSticker } from '@/components/platform-sticker';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';

import { FlowDone, PLATFORMS, useColors, type VariantProps } from './shared';
import { type CoachStage, HomeWithCoach, SignUpGate } from './variant-e';

type Stage = 'intro' | CoachStage;

export function VariantF({ onStep }: VariantProps) {
  const [stage, setStage] = useState<Stage>('intro');
  useEffect(() => onStep(stage), [stage, onStep]);

  // Coach fermé (croix) : le compte reste obligatoire, on y va directement.
  const setCoachStage = (s: CoachStage) => setStage(s === 'home' ? 'account' : s);

  if (stage === 'done') return <FlowDone onRestart={() => setStage('intro')} />;
  if (stage === 'intro') return <IntroCarousel onDone={() => setStage('save')} />;
  if (stage === 'account')
    return (
      <SignUpGate
        onDone={() => setStage('done')}
        title="Last step: your account"
        body="You need an account to keep saving posts. It backs them up and syncs them across your phones."
      />
    );
  return <HomeWithCoach stage={stage} setStage={setCoachStage} onFinish={() => setStage('account')} />;
}

const PAGES = 2;

function IntroCarousel({ onDone }: { onDone: () => void }) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const scroll = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const [page, setPage] = useState(0);

  const next = () => {
    if (page === PAGES - 1) return onDone();
    scroll.current?.scrollTo({ x: (page + 1) * width, animated: true });
    setPage(page + 1);
  };

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <View className="h-12 flex-row items-center justify-end px-4">
        <Button variant="ghost" size="sm" onPress={onDone}>
          <Text>Skip</Text>
        </Button>
      </View>
      <ScrollView
        ref={scroll}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}>
        <View style={{ width, gap: 20 }} className="flex-1 items-center justify-center px-8">
          <View className="flex-row" style={{ gap: 10 }}>
            {PLATFORMS.map((p) => (
              <PlatformSticker key={p} platform={p} size="md" />
            ))}
          </View>
          <Text className="text-center text-3xl font-bold">All your saved posts, in one place</Text>
          <Text variant="muted" className="text-center text-base">
            Keep the posts you love from Instagram, TikTok, X, Threads and Reddit — no more digging through five
            apps.
          </Text>
        </View>
        <View style={{ width, gap: 20 }} className="flex-1 justify-center px-8">
          <Text className="text-center text-3xl font-bold">Find them again, anytime</Text>
          {[
            { icon: FolderOpen, text: 'Sort posts into collections' },
            { icon: StickyNote, text: 'Add a note to remember why you saved it' },
            { icon: Search, text: 'Search captions and notes' },
          ].map(({ icon, text }) => (
            <View key={text} className="flex-row items-center rounded-2xl bg-card p-4" style={{ gap: 14 }}>
              <View className="h-10 w-10 items-center justify-center rounded-full bg-muted">
                <Icon as={icon} size={20} color={colors.foreground} />
              </View>
              <Text className="flex-1 text-base">{text}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
      <View className="items-center px-6" style={{ gap: 16, paddingBottom: insets.bottom + 96 }}>
        <View className="flex-row" style={{ gap: 8 }}>
          {Array.from({ length: PAGES }, (_, i) => (
            <View key={i} className={i === page ? 'h-2 w-6 rounded-full bg-foreground' : 'h-2 w-2 rounded-full bg-border'} />
          ))}
        </View>
        <Button className="h-12 w-full rounded-2xl" onPress={next}>
          <Text className="font-semibold">{page === PAGES - 1 ? "Let's save your first post" : 'Next'}</Text>
        </Button>
      </View>
    </View>
  );
}
