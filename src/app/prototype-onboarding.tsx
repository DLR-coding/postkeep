// PROTOTYPE — jetable. Cinq variantes du parcours d'onboarding complet (bienvenue → épingler
// PostKeep → premier post → compte obligatoire), choisies par `?variant=A..G`.
// Ouvrir : Settings → Onboarding prototypes (build de dev), ou `npm run prototype:onboarding`.
import { Stack, useLocalSearchParams, usePreventRemove, useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight, X } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { prototypeShare } from '@/screens/prototype-onboarding/share-return';
import { VariantA } from '@/screens/prototype-onboarding/variant-a';
import { VariantB } from '@/screens/prototype-onboarding/variant-b';
import { VariantC } from '@/screens/prototype-onboarding/variant-c';
import { VariantD } from '@/screens/prototype-onboarding/variant-d';
import { VariantE } from '@/screens/prototype-onboarding/variant-e';
import { VariantF } from '@/screens/prototype-onboarding/variant-f';
import { VariantG } from '@/screens/prototype-onboarding/variant-g';

const VARIANTS = {
  A: { name: 'Carousel', C: VariantA },
  B: { name: 'Checklist', C: VariantB },
  C: { name: 'Chat', C: VariantC },
  D: { name: 'Stories', C: VariantD },
  E: { name: 'Account first + coach', C: VariantE },
  F: { name: 'Carousel → coach → account', C: VariantF },
  G: { name: 'Welcome → pin → test → account', C: VariantG },
} as const;
type Key = keyof typeof VARIANTS;
const KEYS = Object.keys(VARIANTS) as Key[];

export default function PrototypeOnboarding() {
  const params = useLocalSearchParams<{ variant?: string }>();
  const key: Key = KEYS.includes(params.variant as Key) ? (params.variant as Key) : 'G';
  const [step, setStep] = useState('');
  const onStep = useCallback((s: string) => setStep(s), []);
  const Variant = VARIANTS[key].C;
  const router = useRouter();
  // Le geste retour faisait quitter le prototype en plein parcours : seule la croix sort.
  const [exiting, setExiting] = useState(false);
  usePreventRemove(!exiting, () => {});
  // Tant que le prototype est ouvert, un partage revient ici au lieu de fermer l'app.
  useEffect(() => {
    prototypeShare.waiting = true;
    return () => {
      prototypeShare.waiting = false;
    };
  }, []);
  useEffect(() => {
    if (!exiting) return;
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }, [exiting, router]);
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      {/* `key` : changer de variante repart de zéro */}
      <Variant key={key} onStep={onStep} />
      <PrototypeSwitcher current={key} step={step} onExit={() => setExiting(true)} />
    </>
  );
}

function PrototypeSwitcher({ current, step, onExit }: { current: Key; step: string; onExit: () => void }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const go = (d: number) => router.setParams({ variant: KEYS[(KEYS.indexOf(current) + d + KEYS.length) % KEYS.length] });
  return (
    <View pointerEvents="box-none" className="absolute inset-x-0 items-center" style={{ bottom: insets.bottom + 16 }}>
      <View
        className="flex-row items-center rounded-full px-2 py-1.5"
        style={{ backgroundColor: '#ff00aa', gap: 4, elevation: 20 }}>
        <Pressable onPress={() => go(-1)} hitSlop={10} className="p-2 active:opacity-60">
          <Icon as={ChevronLeft} size={20} color="#fff" />
        </Pressable>
        <View className="items-center" style={{ minWidth: 170 }}>
          <Text className="text-sm font-bold text-white">
            {current} · {VARIANTS[current].name}
          </Text>
          <Text className="text-[11px] text-white/80">{step}</Text>
        </View>
        <Pressable onPress={() => go(1)} hitSlop={10} className="p-2 active:opacity-60">
          <Icon as={ChevronRight} size={20} color="#fff" />
        </Pressable>
        <Pressable onPress={onExit} hitSlop={10} className="ml-1 rounded-full bg-white/25 p-1.5 active:opacity-60" accessibilityLabel="Exit prototype">
          <Icon as={X} size={16} color="#fff" />
        </Pressable>
      </View>
    </View>
  );
}
