import { type ComponentRef, useRef } from 'react';
import { View } from 'react-native';
import { BlurTargetView } from 'expo-blur';
import { Tabs } from 'expo-router/js-tabs';

import { GlassTabBar } from '@/components/glass-tab-bar';

/** Onglets JS sans barre native : `GlassTabBar` (frère du `BlurTargetView`, comme
 *  l'exige expo-blur sur Android) remplace `NativeTabs`. L'onglet actif vient de
 *  l'URL (`usePathname`), la navigation passe par `router.navigate`. */
export default function TabsLayout() {
  const blurTarget = useRef<ComponentRef<typeof View>>(null);
  return (
    <View className="flex-1">
      <BlurTargetView ref={blurTarget} style={{ flex: 1 }}>
        <Tabs tabBar={() => null} screenOptions={{ headerShown: false }}>
          <Tabs.Screen name="index" />
          <Tabs.Screen name="collections" />
        </Tabs>
      </BlurTargetView>
      <GlassTabBar blurTarget={blurTarget} />
    </View>
  );
}
