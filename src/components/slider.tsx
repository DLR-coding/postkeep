import { useState } from 'react';
import { PanResponder, useColorScheme, View } from 'react-native';

import { THEME } from '@/lib/theme';

const THUMB = 22;

/** Curseur horizontal en JS (repris de budget-app ; pas de module natif, donc pas de build).
 *  `onChange` reçoit la valeur brute : à l'appelant de la borner et de l'arrondir à son pas. */
export function Slider({
  value,
  min,
  max,
  onChange,
  accessibilityLabel,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  accessibilityLabel: string;
}) {
  const colors = THEME[useColorScheme() === 'dark' ? 'dark' : 'light'];
  const [width, setWidth] = useState(0);
  const ratio = Math.min(1, Math.max(0, (value - min) / (max - min || 1)));
  const at = (x: number) => min + Math.min(1, Math.max(0, x / (width || 1))) * (max - min);
  // locationX est relatif à la piste : pouce et remplissage ignorent le toucher (pointerEvents).
  const pan = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false, // le défilement vertical ne vole pas le geste
    onPanResponderGrant: (e) => onChange(at(e.nativeEvent.locationX)),
    onPanResponderMove: (e) => onChange(at(e.nativeEvent.locationX)),
  });
  const step = (max - min) / 20;
  return (
    <View
      style={{ height: 36, justifyContent: 'center' }}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min, max, now: value }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => onChange(value + (e.nativeEvent.actionName === 'increment' ? step : -step))}
      {...pan.panHandlers}>
      <View
        pointerEvents="none"
        style={{ height: 4, borderRadius: 2, backgroundColor: colors.muted, overflow: 'hidden' }}>
        <View style={{ height: 4, width: `${ratio * 100}%`, backgroundColor: colors.primary }} />
      </View>
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: ratio * width - THUMB / 2,
          width: THUMB,
          height: THUMB,
          borderRadius: THUMB / 2,
          backgroundColor: colors.background,
          borderWidth: 2,
          borderColor: colors.primary,
        }}
      />
    </View>
  );
}
