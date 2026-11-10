import type { ComponentProps } from 'react';
import { useColorScheme, View } from 'react-native';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { CONTROL_HEIGHT, RADIUS } from '@/lib/design';
import { THEME } from '@/lib/theme';

type Colors = (typeof THEME)['light'];

/** Fond commun des feuilles du bas (coins `RADIUS.sheet`), à passer à `backgroundStyle`. */
export function sheetBackgroundStyle(colors: Colors) {
  return {
    backgroundColor: colors.card,
    borderTopLeftRadius: RADIUS.sheet,
    borderTopRightRadius: RADIUS.sheet,
  };
}

/** Champ texte d'une feuille : même encart que la note (fond `note`, sans bord), 48 px. */
export function SheetField(props: ComponentProps<typeof BottomSheetTextInput>) {
  const colors = THEME[useColorScheme() === 'dark' ? 'dark' : 'light'];
  return (
    <BottomSheetTextInput
      placeholderTextColor={colors.mutedForeground}
      {...props}
      style={[
        {
          height: CONTROL_HEIGHT,
          borderRadius: RADIUS.control,
          borderCurve: 'continuous',
          paddingHorizontal: 14,
          fontSize: 15,
          backgroundColor: colors.note,
          color: colors.foreground,
        },
        props.style,
      ]}
    />
  );
}

/** Paire de boutons de bas de feuille : annuler (doux) + confirmer (plein, ou rouge doux
 *  pour une action destructive), 48 px, rayon `RADIUS.control`. */
export function SheetActions({
  cancelLabel = 'Cancel',
  onCancel,
  confirmLabel,
  onConfirm,
  destructive = false,
  confirmDisabled = false,
}: {
  cancelLabel?: string;
  onCancel: () => void;
  confirmLabel: string;
  onConfirm: () => void;
  destructive?: boolean;
  confirmDisabled?: boolean;
}) {
  const colors = THEME[useColorScheme() === 'dark' ? 'dark' : 'light'];
  return (
    <View className="flex-row gap-2">
      <Button
        variant="ghost"
        className="h-12 flex-1 rounded-2xl"
        style={{ backgroundColor: colors.chip }}
        onPress={onCancel}>
        <Text className="font-semibold" style={{ color: colors.foreground }}>
          {cancelLabel}
        </Text>
      </Button>
      <Button
        variant={destructive ? 'ghost' : 'default'}
        className="h-12 flex-1 rounded-2xl"
        style={destructive ? { backgroundColor: colors.destructiveSoft } : undefined}
        disabled={confirmDisabled}
        onPress={onConfirm}>
        <Text className={destructive ? 'font-semibold text-destructive' : 'font-semibold'}>{confirmLabel}</Text>
      </Button>
    </View>
  );
}
