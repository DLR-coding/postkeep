import { type ComponentRef, type RefObject, useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, Pressable, useColorScheme } from 'react-native';
import {
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
  BottomSheetModal,
  type BottomSheetTextInput,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import * as Haptics from 'expo-haptics';

import { SheetField, sheetBackgroundStyle } from '@/components/sheet-kit';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { signIn, signUp } from '@/lib/sync/account';
import { THEME } from '@/lib/theme';

const MIN_PASSWORD = 8;

/** Connexion / création de compte, empilée par-dessus les paramètres
 *  (`stackBehavior="push"`, comme `CollectionPickerSheet` : la feuille des paramètres reste
 *  en place dessous). Hauteur ajustée au contenu ; `keyboardBehavior="interactive"` la
 *  remonte au-dessus du clavier, bouton compris. Se ferme à la réussite : les paramètres
 *  passent d'eux-mêmes à l'état connecté via `account-store`. */
export function AccountSheet({ sheetRef }: { sheetRef: RefObject<BottomSheetModal | null> }) {
  const colors = THEME[useColorScheme() === 'dark' ? 'dark' : 'light'];
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const passwordRef = useRef<ComponentRef<typeof BottomSheetTextInput>>(null);
  const creating = mode === 'signUp';

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} pressBehavior="close" />
    ),
    []
  );

  const submit = async () => {
    if (loading || !email.trim() || !password) return;
    if (creating && password.length < MIN_PASSWORD) {
      setError(`Password must be at least ${MIN_PASSWORD} characters.`);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await (creating ? signUp : signIn)(email.trim(), password);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Keyboard.dismiss();
      sheetRef.current?.dismiss();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <BottomSheetModal
      ref={sheetRef}
      stackBehavior="push"
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      backdropComponent={renderBackdrop}
      // Le mot de passe et l'erreur ne survivent pas à une fermeture ; l'email, si.
      onDismiss={() => {
        setPassword('');
        setError(null);
      }}
      backgroundStyle={sheetBackgroundStyle(colors)}
      handleIndicatorStyle={{ backgroundColor: colors.mutedForeground }}>
      <BottomSheetView className="gap-3 px-6 pb-8 pt-2">
        <Text className="text-xl font-semibold">{creating ? 'Create account' : 'Sign in'}</Text>
        <Text variant="muted" className="mb-1 text-sm">
          Back up your posts and find them on all your phones.
        </Text>
        <SheetField
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          autoComplete="email"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => passwordRef.current?.focus()}
        />
        <SheetField
          ref={passwordRef}
          value={password}
          onChangeText={setPassword}
          placeholder={creating ? `Password (${MIN_PASSWORD}+ characters)` : 'Password'}
          secureTextEntry
          autoComplete={creating ? 'new-password' : 'password'}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="go"
          onSubmitEditing={submit}
        />
        {!!error && <Text className="text-sm text-destructive">{error}</Text>}
        <Button className="mt-1 h-12 rounded-2xl" disabled={loading || !email.trim() || !password} onPress={submit}>
          {loading ? (
            <ActivityIndicator color={colors.primaryForeground} />
          ) : (
            <Text className="font-semibold">{creating ? 'Create account' : 'Sign in'}</Text>
          )}
        </Button>
        <Pressable
          onPress={() => {
            setMode(creating ? 'signIn' : 'signUp');
            setError(null);
          }}
          disabled={loading}
          accessibilityRole="button"
          className="items-center py-2 active:opacity-60">
          <Text variant="muted" className="text-sm">
            {creating ? 'Already have an account? ' : 'New here? '}
            <Text className="text-sm font-semibold">{creating ? 'Sign in' : 'Create an account'}</Text>
          </Text>
        </Pressable>
      </BottomSheetView>
    </BottomSheetModal>
  );
}
