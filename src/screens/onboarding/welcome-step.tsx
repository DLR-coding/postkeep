// Onboarding, étape 1 : bienvenue (les plateformes prises en charge, ce que fait l'app).
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PlatformSticker } from '@/components/platform-sticker';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import type { Platform } from '@/lib/share-url';

const PLATFORMS: Platform[] = ['instagram', 'tiktok', 'x', 'threads', 'reddit'];
const STEP_COUNT = 4;

export function WelcomeStep({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <View className="h-12 flex-row items-center justify-end px-4">
        <Button variant="ghost" size="sm" onPress={onSkip}>
          <Text>Skip</Text>
        </Button>
      </View>
      <View className="flex-1 items-center justify-center px-8" style={{ gap: 20 }}>
        <View className="flex-row" style={{ gap: 10 }}>
          {PLATFORMS.map((p) => (
            <PlatformSticker key={p} platform={p} size="md" />
          ))}
        </View>
        <Text className="text-center text-3xl font-bold">All your saved posts, in one place</Text>
        <Text variant="muted" className="text-center text-base">
          Keep posts from Instagram, TikTok, X, Threads and Reddit. Sort them into collections, add notes, find them
          with search.
        </Text>
      </View>
      <View className="items-center px-6" style={{ gap: 16, paddingBottom: insets.bottom + 24 }}>
        <View className="flex-row" style={{ gap: 8 }}>
          {Array.from({ length: STEP_COUNT }, (_, i) => (
            <View key={i} className={i === 0 ? 'h-2 w-6 rounded-full bg-foreground' : 'h-2 w-2 rounded-full bg-border'} />
          ))}
        </View>
        <Button className="h-12 w-full rounded-2xl" onPress={onNext}>
          <Text className="font-semibold">Next</Text>
        </Button>
      </View>
    </View>
  );
}
