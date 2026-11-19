// PROTOTYPE — Variante E « Compte d'abord + coach » : écran d'inscription d'entrée (on ne
/* eslint-disable react/no-unescaped-entities -- prototype jetable */
// peut rien enregistrer sans compte), puis l'accueil vide avec une carte coach en bas qui
// guide l'épinglage et le premier partage, sur place.
import { Bookmark, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Image, KeyboardAvoidingView, Pressable, ScrollView, View } from 'react-native';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PlatformSticker } from '@/components/platform-sticker';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';

import {
  AccountFields,
  FlowDone,
  SavedBadge,
  useColors,
  type VariantProps,
} from './shared';
import { ShareRehearsal, StepsStrip } from './share-rehearsal';

export type CoachStage = 'account' | 'pin' | 'save' | 'practice' | 'saved' | 'home' | 'done';

export function VariantE({ onStep }: VariantProps) {
  const [stage, setStage] = useState<CoachStage>('account');
  useEffect(() => onStep(stage), [stage, onStep]);

  if (stage === 'done') return <FlowDone onRestart={() => setStage('account')} />;
  if (stage === 'account') return <SignUpGate onDone={() => setStage('save')} />;
  return <HomeWithCoach stage={stage} setStage={setStage} onFinish={() => setStage('done')} />;
}

const GATE_BODY =
  'Save posts from Instagram, TikTok, X, Threads and Reddit, sort them into collections and find them anytime. Create your account to start: your posts are backed up and synced across your phones.';

export function SignUpGate({
  onDone,
  title = 'Welcome to PostKeep',
  body = GATE_BODY,
}: {
  onDone: () => void;
  title?: string;
  body?: string;
}) {
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView behavior="padding" className="flex-1 bg-background">
      <ScrollView
        contentContainerClassName="flex-grow justify-center px-7"
        contentContainerStyle={{ gap: 22, paddingTop: insets.top + 24, paddingBottom: insets.bottom + 110 }}
        keyboardShouldPersistTaps="handled">
        <Image source={require('../../../assets/images/icon.png')} style={{ width: 72, height: 72, borderRadius: 20 }} />
        <View style={{ gap: 8 }}>
          <Text className="text-3xl font-bold">{title}</Text>
          <Text variant="muted" className="text-base">
            {body}
          </Text>
        </View>
        <AccountFields onDone={onDone} cta="Create account" />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export function HomeWithCoach({
  stage,
  setStage,
  onFinish,
}: {
  stage: CoachStage;
  setStage: (s: CoachStage) => void;
  onFinish: () => void;
}) {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const hasPost = stage === 'saved' || stage === 'home';
  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      {/* Accueil simulé, derrière la carte coach */}
      <View className="px-5 pt-4" style={{ gap: 16 }}>
        <Text className="text-3xl font-bold">All posts</Text>
        {hasPost ? (
          <Animated.View entering={FadeIn.duration(400)} className="flex-row rounded-3xl bg-card p-3" style={{ gap: 12 }}>
            <View className="h-20 w-16 rounded-xl bg-muted" />
            <View className="flex-1" style={{ gap: 6 }}>
              <PlatformSticker platform="instagram" size="sm" />
              <Text numberOfLines={2}>Your first saved post appears here, with its caption and thumbnail.</Text>
            </View>
          </Animated.View>
        ) : (
          <View className="items-center pt-16 opacity-40" style={{ gap: 12 }}>
            <View className="h-20 w-20 items-center justify-center rounded-full bg-muted">
              <Icon as={Bookmark} size={32} color={colors.mutedForeground} />
            </View>
            <Text className="text-xl font-semibold">Nothing to show yet</Text>
          </View>
        )}
      </View>
      {stage !== 'home' && stage !== 'practice' && (
        <Animated.View
          key={stage}
          entering={SlideInDown.duration(350)}
          className="absolute inset-x-3 rounded-3xl border border-border bg-card p-5"
          style={{ bottom: insets.bottom + 96, gap: 14, elevation: 12 }}>
          <View className="flex-row items-center justify-between">
            <Text variant="muted" className="text-xs font-semibold uppercase">
              {stage === 'saved' ? 'All set' : 'Your first post'}
            </Text>
            <Pressable onPress={() => setStage('home')} hitSlop={12} className="active:opacity-60">
              <Icon as={X} size={18} color={colors.mutedForeground} />
            </Pressable>
          </View>
          {stage === 'save' && (
            <>
              <Text className="text-2xl font-bold">Save your first post</Text>
              <Text className="text-base">
                Let's do it together on an example video. Just follow the yellow circle.
              </Text>
              <Button className="h-14 rounded-2xl" onPress={() => setStage('practice')}>
                <Text className="text-lg font-semibold">Show me</Text>
              </Button>
            </>
          )}
          {stage === 'saved' && (
            <>
              <SavedBadge />
              <Text variant="muted" className="text-center">
                That's it! Do the same 4 steps on any video you like:
              </Text>
              <StepsStrip />
              <Button className="h-12 rounded-2xl" onPress={onFinish}>
                <Text className="font-semibold">Got it</Text>
              </Button>
            </>
          )}
        </Animated.View>
      )}
      {stage === 'practice' && <ShareRehearsal onDone={() => setStage('saved')} onSkip={onFinish} />}
      {stage === 'home' && (
        <View className="absolute inset-x-0 items-center" style={{ bottom: insets.bottom + 110 }}>
          <Button variant="outline" onPress={onFinish}>
            <Text>(coach dismissed) finish</Text>
          </Button>
        </View>
      )}
    </View>
  );
}
