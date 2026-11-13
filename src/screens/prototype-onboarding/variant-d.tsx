// PROTOTYPE — Variante D « Stories » : plein écran coloré façon stories, barres de progression
/* eslint-disable react/no-unescaped-entities -- prototype jetable */
// en haut, toucher à droite/gauche pour avancer/reculer. Gros texte, une idée par écran.
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Pressable, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
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

const BG = ['#ff5a36', '#6d4aff', '#111111', undefined];
const LABELS = ['Welcome', 'Pin', 'Save first post', 'Account'];

export function VariantD({ onStep }: VariantProps) {
  const insets = useSafeAreaInsets();
  const [i, setI] = useState(0);
  const [save, setSave] = useState<'idle' | 'waiting' | 'saved'>('idle');
  const [done, setDone] = useState(false);

  useEffect(() => onStep(done ? 'done' : `${LABELS[i]}${i === 2 ? ` (${save})` : ''}`), [i, save, done, onStep]);

  if (done)
    return (
      <FlowDone
        onRestart={() => {
          setDone(false);
          setI(0);
          setSave('idle');
        }}
      />
    );

  const light = i < 3; // texte blanc sur les fonds colorés
  const fg = light ? 'text-white' : '';
  const muted = light ? 'text-white/75' : 'text-muted-foreground';

  return (
    <Pressable
      className={i === 3 ? 'flex-1 bg-background' : 'flex-1'}
      style={{ backgroundColor: BG[i], paddingTop: insets.top + 8 }}
      onPress={(e) => {
        if (i === 3) return;
        const right = e.nativeEvent.pageX > 120;
        setI(Math.max(0, i + (right ? 1 : -1)));
      }}>
      <View className="flex-row px-3" style={{ gap: 4 }}>
        {LABELS.map((l, k) => (
          <View key={l} className={light ? 'h-1 flex-1 rounded-full bg-white/30' : 'h-1 flex-1 rounded-full bg-border'}>
            {k <= i && <View className={light ? 'h-1 rounded-full bg-white' : 'h-1 rounded-full bg-foreground'} />}
          </View>
        ))}
      </View>
      <KeyboardAvoidingView behavior="padding" className="flex-1">
        <Animated.View key={i} entering={FadeIn.duration(300)} className="flex-1 justify-end px-7" style={{ gap: 22, paddingBottom: insets.bottom + 110 }}>
          {i === 0 && (
            <>
              <View className="flex-row flex-wrap" style={{ gap: 12 }}>
                {PLATFORMS.map((p) => (
                  <PlatformSticker key={p} platform={p} size="md" />
                ))}
              </View>
              <Text className={`text-5xl font-black leading-[52px] ${fg}`}>Every post you love. One place.</Text>
              <Text className={`text-lg ${muted}`}>Tap to continue</Text>
            </>
          )}
          {i === 1 && (
            <>
              <Text className={`text-5xl font-black leading-[52px] ${fg}`}>Pin PostKeep first.</Text>
              <FakeShareSheet showPin />
              <Text className={`text-lg ${muted}`}>So it's always the first app in your share menu.</Text>
              <Button className="h-12 self-start rounded-full bg-white px-6" onPress={openShareMenu}>
                <Text className="font-semibold text-black">Open the share menu</Text>
              </Button>
            </>
          )}
          {i === 2 && (
            <>
              {save === 'saved' ? (
                <View className="items-start">
                  <SavedBadge />
                </View>
              ) : (
                <Text className={`text-5xl font-black leading-[52px] ${fg}`}>Now save a real post.</Text>
              )}
              <Text className={`text-lg ${muted}`}>Share → PostKeep → Save. You'll land right back here.</Text>
              {save !== 'saved' && <PlatformRow onPick={() => setSave('waiting')} />}
              {save === 'waiting' && <WaitingForPost onArrived={() => setSave('saved')} />}
            </>
          )}
          {i === 3 && (
            <>
              <Text className="text-4xl font-black leading-[44px]">Last step: your account.</Text>
              <Text variant="muted" className="text-lg">
                Required to save posts. Backed up, synced across your phones.
              </Text>
              <AccountFields onDone={() => setDone(true)} />
            </>
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </Pressable>
  );
}
