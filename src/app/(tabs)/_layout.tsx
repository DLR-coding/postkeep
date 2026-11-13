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
  // Vue capturée par le verre liquide : une View native simple (la ref du BlurTargetView
  // n'expose ni measureInWindow ni une vue capturable), à fond opaque pour que la capture
  // n'ait pas de trous transparents (noir sous le verre).
  const scene = useRef<ComponentRef<typeof View>>(null);
  return (
    <View className="flex-1">
      <BlurTargetView ref={blurTarget} style={{ flex: 1 }}>
        <View ref={scene} collapsable={false} className="flex-1 bg-background">
          <Tabs tabBar={() => null} screenOptions={{ headerShown: false }}>
            <Tabs.Screen name="index" />
            <Tabs.Screen name="collections" />
            {/* Réglages du verre, ouverts depuis Settings : onglet sans bouton, pour garder la
                barre visible (elle réfracte l'écran pendant qu'on règle). */}
            <Tabs.Screen name="glass" />
          </Tabs>
        </View>
      </BlurTargetView>
      <GlassTabBar blurTarget={blurTarget} scene={scene} />
    </View>
  );
}
