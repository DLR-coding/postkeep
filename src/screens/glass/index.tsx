import { useState } from 'react';
import { Pressable, ScrollView, useColorScheme, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, RotateCcw } from 'lucide-react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { TAB_BAR_CLEARANCE } from '@/components/glass-tab-bar';
import { glassSettings, setGlassSettings } from '@/components/liquid-glass';
import { SectionLabel } from '@/components/post-fields-form';
import { Slider } from '@/components/slider';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { clampParam, DEFAULT_GLASS, GLASS_SECTIONS, type GlassParam, type GlassSettings } from '@/lib/glass-settings';
import { THEME } from '@/lib/theme';

/** Réglages du verre liquide de la barre flottante, appliqués en direct (ouvert depuis
 *  Settings). Onglet caché pour que la barre reste visible : elle réfracte cet écran pendant
 *  qu'on règle ; changer d'onglet montre le mouvement de la bulle. */
export function GlassScreen() {
  const colors = THEME[useColorScheme() === 'dark' ? 'dark' : 'light'];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [settings, setSettings] = useState<GlassSettings>(() => glassSettings.value);
  const update = (next: GlassSettings) => {
    setSettings(next);
    setGlassSettings(next);
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-row items-center gap-3 px-5 pb-1 pt-4">
        <Pressable
          onPress={() => router.navigate('/')}
          accessibilityLabel="Back"
          hitSlop={8}
          className="h-10 w-10 items-center justify-center rounded-full bg-muted active:scale-95">
          <Icon as={ArrowLeft} size={20} color={colors.foreground} />
        </Pressable>
        <Text className="flex-1 text-3xl font-bold">Liquid glass</Text>
        <Pressable
          onPress={() => update({ ...DEFAULT_GLASS })}
          accessibilityLabel="Reset to defaults"
          hitSlop={8}
          className="h-10 w-10 items-center justify-center rounded-full bg-muted active:scale-95">
          <Icon as={RotateCcw} size={18} color={colors.foreground} />
        </Pressable>
      </View>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, gap: 20, paddingBottom: TAB_BAR_CLEARANCE + insets.bottom + 16 }}>
        <Text variant="muted" className="text-sm">
          The bar below refracts this screen: scroll to see the glass over content, switch tabs to
          see the bubble move.
        </Text>
        {GLASS_SECTIONS.map((section) => (
          <View key={section.title} className="gap-1">
            <SectionLabel>{section.title}</SectionLabel>
            {section.params.map((p) => (
              <ParamRow
                key={p.key}
                param={p}
                value={settings[p.key]}
                onChange={(v) => update({ ...settings, [p.key]: clampParam(p.key, v) })}
              />
            ))}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function ParamRow({ param, value, onChange }: { param: GlassParam; value: number; onChange: (v: number) => void }) {
  const decimals = param.step >= 1 ? 0 : (String(param.step).split('.')[1]?.length ?? 2);
  const changed = value !== DEFAULT_GLASS[param.key];
  return (
    <View className="pt-2">
      <View className="flex-row items-baseline justify-between">
        <Text className="flex-1 text-base">{param.label}</Text>
        <Text className={`text-sm ${changed ? 'font-semibold' : 'text-muted-foreground'}`} style={{ fontVariant: ['tabular-nums'] }}>
          {value.toFixed(decimals)}
        </Text>
      </View>
      <Slider value={value} min={param.min} max={param.max} onChange={onChange} accessibilityLabel={param.label} />
    </View>
  );
}
