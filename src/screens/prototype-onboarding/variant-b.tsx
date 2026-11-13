// PROTOTYPE — Variante B « Checklist » : un seul écran, 3 étapes cochées l'une après l'autre,
/* eslint-disable react/no-unescaped-entities -- prototype jetable */
// tout le parcours visible d'un coup d'œil. Rien à faire glisser.
import { Check, Lock } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';

import {
  AccountFields,
  FakeShareSheet,
  FlowDone,
  openShareMenu,
  PlatformRow,
  useColors,
  WaitingForPost,
  type VariantProps,
} from './shared';

type StepState = 'todo' | 'active' | 'done' | 'skipped';
const STEPS = ['Pin PostKeep to your share menu', 'Save your first post', 'Create your account'];

export function VariantB({ onStep }: VariantProps) {
  const insets = useSafeAreaInsets();
  const [current, setCurrent] = useState(0);
  const [skippedSave, setSkippedSave] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [finished, setFinished] = useState(false);

  useEffect(() => onStep(finished ? 'done' : `step ${current + 1}/3${waiting ? ' (waiting)' : ''}`), [current, waiting, finished, onStep]);

  if (finished)
    return (
      <FlowDone
        onRestart={() => {
          setFinished(false);
          setCurrent(0);
          setSkippedSave(false);
          setWaiting(false);
        }}
      />
    );

  const state = (i: number): StepState =>
    i === 1 && skippedSave && current > 1 ? 'skipped' : i < current ? 'done' : i === current ? 'active' : 'todo';

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="px-6"
      contentContainerStyle={{ paddingTop: insets.top + 32, paddingBottom: insets.bottom + 120, gap: 24 }}
      keyboardShouldPersistTaps="handled">
      <View style={{ gap: 6 }}>
        <Text className="text-3xl font-bold">Welcome to PostKeep</Text>
        <Text variant="muted" className="text-base">
          Keep the posts you love from Instagram, TikTok, X, Threads and Reddit. Three steps and you're in.
        </Text>
      </View>
      <View className="h-1.5 overflow-hidden rounded-full bg-border">
        <View className="h-full bg-foreground" style={{ width: `${(current / 3) * 100}%` }} />
      </View>
      <View style={{ gap: 12 }}>
        {STEPS.map((title, i) => (
          <StepCard key={title} index={i} title={title} state={state(i)}>
            {i === 0 && (
              <>
                <FakeShareSheet showPin compact />
                <Text variant="muted">Open the share menu, long-press PostKeep, tap Pin.</Text>
                <View className="flex-row" style={{ gap: 8 }}>
                  <Button variant="outline" className="flex-1" onPress={openShareMenu}>
                    <Text>Share menu</Text>
                  </Button>
                  <Button className="flex-1" onPress={() => setCurrent(1)}>
                    <Text>It's pinned</Text>
                  </Button>
                </View>
              </>
            )}
            {i === 1 && (
              <>
                <Text variant="muted">Pick an app, tap Share on any post, then PostKeep, then Save.</Text>
                <PlatformRow onPick={() => setWaiting(true)} />
                {waiting && (
                  <WaitingForPost
                    onArrived={() => {
                      setWaiting(false);
                      setCurrent(2);
                    }}
                  />
                )}
                <Button
                  variant="ghost"
                  onPress={() => {
                    setSkippedSave(true);
                    setCurrent(2);
                  }}>
                  <Text>I'll do it later</Text>
                </Button>
              </>
            )}
            {i === 2 && (
              <>
                <Text variant="muted">Required to save posts: it backs them up and syncs them across your phones.</Text>
                <AccountFields onDone={() => setFinished(true)} cta="Create account & start" />
              </>
            )}
          </StepCard>
        ))}
      </View>
    </ScrollView>
  );
}

function StepCard({ index, title, state, children }: { index: number; title: string; state: StepState; children: React.ReactNode }) {
  const colors = useColors();
  const active = state === 'active';
  return (
    <View className={active ? 'rounded-3xl border-2 border-foreground bg-card p-4' : 'rounded-3xl border border-border bg-card p-4'} style={{ gap: 14 }}>
      <View className="flex-row items-center" style={{ gap: 12 }}>
        <View className={state === 'done' ? 'h-8 w-8 items-center justify-center rounded-full bg-foreground' : 'h-8 w-8 items-center justify-center rounded-full bg-muted'}>
          {state === 'done' ? (
            <Icon as={Check} size={16} color={colors.background} />
          ) : state === 'todo' ? (
            <Icon as={Lock} size={14} color={colors.mutedForeground} />
          ) : (
            <Text className="font-semibold">{index + 1}</Text>
          )}
        </View>
        <Text className={state === 'todo' ? 'flex-1 text-base text-muted-foreground' : 'flex-1 text-base font-semibold'}>{title}</Text>
        {state === 'skipped' && <Text variant="muted" className="text-xs">Later</Text>}
      </View>
      {active && (
        <Animated.View entering={FadeIn.duration(250)} style={{ gap: 14 }}>
          {children}
        </Animated.View>
      )}
    </View>
  );
}
