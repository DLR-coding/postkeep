// PROTOTYPE — Variante C « Conversation » : PostKeep guide en messages, l'utilisateur répond
// par des boutons. Les maquettes et le formulaire arrivent comme des bulles.
import { useEffect, useRef, useState } from 'react';
import { Image, ScrollView, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';

import {
  AccountFields,
  FakeShareSheet,
  FlowDone,
  openShareMenu,
  PlatformRow,
  SavedBadge,
  WaitingForPost,
  type VariantProps,
} from './shared';

type Msg = { from: 'app' | 'me'; text?: string; node?: 'share' | 'platforms' | 'saved' | 'account' };
type Stage = 'hello' | 'pin' | 'save' | 'waiting' | 'account' | 'done';

const INTRO: Msg[] = [
  { from: 'app', text: 'Hi! PostKeep keeps the posts you love from Instagram, TikTok, X, Threads and Reddit.' },
  { from: 'app', text: 'Let me show you how it works. It takes a minute.' },
];

export function VariantC({ onStep }: VariantProps) {
  const insets = useSafeAreaInsets();
  const scroll = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const [msgs, setMsgs] = useState<Msg[]>(INTRO);
  const [stage, setStage] = useState<Stage>('hello');

  useEffect(() => onStep(stage), [stage, onStep]);

  const say = (next: Stage, ...add: Msg[]) => {
    setMsgs((m) => [...m, ...add]);
    setStage(next);
  };

  if (stage === 'done')
    return (
      <FlowDone
        onRestart={() => {
          setMsgs(INTRO);
          setStage('hello');
        }}
      />
    );

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center border-b border-border px-4 py-3" style={{ gap: 10 }}>
        <Image source={require('../../../assets/images/icon.png')} style={{ width: 32, height: 32, borderRadius: 16 }} />
        <Text className="text-base font-semibold">PostKeep</Text>
      </View>
      <ScrollView
        ref={scroll}
        className="flex-1"
        contentContainerClassName="px-4 py-4"
        contentContainerStyle={{ gap: 8 }}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}>
        {msgs.map((m, i) => (
          <Bubble key={i} msg={m} onPick={() => say('waiting')} onAccountDone={() => setStage('done')} />
        ))}
        {stage === 'waiting' && <WaitingForPost onArrived={() => say('account', { from: 'app', node: 'saved' }, { from: 'app', text: 'One last thing: create your account. It backs up your posts and syncs them. You need it to keep saving.' }, { from: 'app', node: 'account' })} />}
      </ScrollView>
      <View className="flex-row flex-wrap justify-end border-t border-border px-4 pt-3" style={{ gap: 8, paddingBottom: insets.bottom + 96 }}>
        {stage === 'hello' && (
          <Reply
            label="Show me"
            onPress={() =>
              say(
                'pin',
                { from: 'me', text: 'Show me' },
                { from: 'app', text: "First, pin me to your share menu so I'm always the first app there." },
                { from: 'app', node: 'share' },
              )
            }
          />
        )}
        {stage === 'pin' && (
          <>
            <Reply label="Open share menu" outline onPress={openShareMenu} />
            <Reply
              label="Done, it's pinned"
              onPress={() =>
                say(
                  'save',
                  { from: 'me', text: "Done, it's pinned" },
                  { from: 'app', text: 'Now save a real post: pick an app, tap Share, then PostKeep, then Save. I’ll bring you back here.' },
                  { from: 'app', node: 'platforms' },
                )
              }
            />
          </>
        )}
        {stage === 'save' && (
          <Reply
            label="Later"
            outline
            onPress={() =>
              say(
                'account',
                { from: 'me', text: 'Later' },
                { from: 'app', text: 'No problem. Create your account first: you need it to start saving.' },
                { from: 'app', node: 'account' },
              )
            }
          />
        )}
      </View>
    </View>
  );
}

function Bubble({ msg, onPick, onAccountDone }: { msg: Msg; onPick: () => void; onAccountDone: () => void }) {
  const mine = msg.from === 'me';
  return (
    <Animated.View entering={FadeInDown.duration(250)} className={mine ? 'items-end' : 'items-start'}>
      {msg.text && (
        <View className={mine ? 'max-w-[80%] rounded-2xl rounded-br-sm bg-primary px-4 py-2.5' : 'max-w-[85%] rounded-2xl rounded-bl-sm bg-card px-4 py-2.5'}>
          <Text className={mine ? 'text-base text-primary-foreground' : 'text-base'}>{msg.text}</Text>
        </View>
      )}
      {msg.node === 'share' && (
        <View className="w-[85%]">
          <FakeShareSheet showPin compact />
        </View>
      )}
      {msg.node === 'platforms' && (
        <View className="rounded-2xl bg-card px-3 py-3">
          <PlatformRow onPick={onPick} />
        </View>
      )}
      {msg.node === 'saved' && (
        <View className="rounded-2xl bg-card px-8 py-4">
          <SavedBadge />
        </View>
      )}
      {msg.node === 'account' && (
        <View className="w-[90%] rounded-2xl bg-card p-4">
          <AccountFields onDone={onAccountDone} />
        </View>
      )}
    </Animated.View>
  );
}

function Reply({ label, onPress, outline }: { label: string; onPress: () => void; outline?: boolean }) {
  return (
    <Button variant={outline ? 'outline' : 'default'} className="rounded-full" onPress={onPress}>
      <Text>{label}</Text>
    </Button>
  );
}
