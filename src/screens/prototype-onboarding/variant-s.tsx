// PROTOTYPE — atelier « S » : compare les variantes de l'animation « done ». L'animation
// sélectionnée se rejoue en boucle sur un écran comme « Pinned! » ; elle devient aussi celle
// des écrans Pinned!/Saved! de la variante G (choix gardé en mémoire, pas enregistré).
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';

import { type VariantProps } from './shared';
import { CHECK_VARIANTS, getCheckVariant, setCheckVariant } from './success-variants';

const LOOP_MS = 2600;

export function VariantS({ onStep }: VariantProps) {
  const insets = useSafeAreaInsets();
  const [key, setKey] = useState(() => getCheckVariant().key);
  const [run, setRun] = useState(0);
  const v = CHECK_VARIANTS.find((c) => c.key === key) ?? CHECK_VARIANTS[0];

  useEffect(() => onStep(`${v.name} · used in G`), [v.name, onStep]);
  useEffect(() => {
    const t = setInterval(() => setRun((r) => r + 1), LOOP_MS);
    return () => clearInterval(t);
  }, [key]);

  const pick = (k: string) => {
    setCheckVariant(k);
    setKey(k);
    setRun((r) => r + 1);
  };

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 96 }}>
      <Pressable className="flex-1 items-center justify-center px-8" style={{ gap: 18 }} onPress={() => setRun((r) => r + 1)}>
        <v.C key={`${key}-${run}`} />
        <Animated.View key={`t-${key}-${run}`} entering={FadeInDown.delay(v.checkAt).duration(350)} className="items-center" style={{ gap: 8 }}>
          <Text className="text-center text-3xl font-bold">Pinned!</Text>
          <Text variant="muted" className="text-center text-base">
            PostKeep will be first in your share menu.
          </Text>
        </Animated.View>
      </Pressable>
      <Text variant="muted" className="pb-2 text-center text-xs">
        Tap to replay · the chosen one is used in G
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0 }}
        contentContainerClassName="px-4"
        contentContainerStyle={{ gap: 8, alignItems: 'center' }}>
        {CHECK_VARIANTS.map((c, i) => (
          <Pressable
            key={c.key}
            onPress={() => pick(c.key)}
            className={c.key === key ? 'rounded-full bg-primary px-4 py-2.5' : 'rounded-full bg-muted px-4 py-2.5'}>
            <Text className={c.key === key ? 'font-semibold text-primary-foreground' : 'font-semibold'}>
              {i}. {c.name}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
