// PROTOTYPE — Variante G (choix du 19 novembre) : base A. 1. bienvenue (page de A) →
// 2. épingler PostKeep (animation + vraie feuille de partage, `pin-page.tsx`) → 3. test
// simulé du partage (faux Reel → Share to → PostKeep → Save, sans l'épinglage) → 4. compte
// obligatoire.
import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PlatformSticker } from '@/components/platform-sticker';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';

import { PinPage } from './pin-page';
import { ShareRehearsal } from './share-rehearsal';
import { FlowDone, PLATFORMS, type VariantProps } from './shared';
import { getCheckVariant } from './success-variants';
import { SignUpGate } from './variant-e';

type Stage = 'welcome' | 'pin' | 'pinDone' | 'test' | 'testDone' | 'account' | 'done';

export function VariantG({ onStep }: VariantProps) {
  const [stage, setStage] = useState<Stage>('welcome');
  useEffect(() => onStep(stage), [stage, onStep]);

  if (stage === 'done') return <FlowDone onRestart={() => setStage('welcome')} />;
  if (stage === 'pin') return <PinPage onContinue={() => setStage('pinDone')} />;
  if (stage === 'pinDone')
    return <DoneCheck title="All set!" body="PostKeep is now easy to find when you share." onNext={() => setStage('test')} />;
  if (stage === 'test')
    return <ShareRehearsal includePin={false} onDone={() => setStage('testDone')} onSkip={() => setStage('account')} />;
  if (stage === 'testDone')
    return <DoneCheck title="Saved!" body="That’s how you save a post. Easy!" onNext={() => setStage('account')} />;
  if (stage === 'account')
    return (
      <SignUpGate
        onDone={() => setStage('done')}
        title="Well done! Last step: your account"
        body="You need an account to keep saving posts. It backs them up and syncs them across your phones."
      />
    );
  return <Welcome onNext={() => setStage('pin')} onSkip={() => setStage('account')} />;
}

const DONE_MS = 2300;

/** Écran « c'est fait » après une étape d'action : animation choisie dans l'atelier S
 *  (`success-variants.tsx`, Burst par défaut), vibration au moment du ✓.
 *  Passe tout seul à la suite après DONE_MS ; un toucher passe tout de suite. */
function DoneCheck({ title, body, onNext }: { title: string; body: string; onNext: () => void }) {
  const [check] = useState(getCheckVariant);
  // `onNext` change à chaque rendu du parent : sans ref, l'effet repartirait (2e vibration,
  // minuteur remis à zéro).
  const next = useRef(onNext);
  useEffect(() => {
    next.current = onNext;
  });
  useEffect(() => {
    const haptic = setTimeout(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success), check.checkAt);
    const t = setTimeout(() => next.current(), DONE_MS);
    return () => {
      clearTimeout(haptic);
      clearTimeout(t);
    };
  }, [check.checkAt]);
  return (
    <Pressable className="flex-1 items-center justify-center bg-background px-8" style={{ gap: 18 }} onPress={onNext}>
      <check.C />
      <Animated.View entering={FadeInDown.delay(check.checkAt).duration(350)} className="items-center" style={{ gap: 8 }}>
        <Text className="text-center text-3xl font-bold">{title}</Text>
        <Text variant="muted" className="text-center text-base">
          {body}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

/** Page de bienvenue de la variante A, avec les 4 points d'étape. */
function Welcome({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) {
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
      <View className="items-center px-6" style={{ gap: 16, paddingBottom: insets.bottom + 96 }}>
        <View className="flex-row" style={{ gap: 8 }}>
          {[0, 1, 2, 3].map((i) => (
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
