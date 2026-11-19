// Onboarding, étape 4 : compte obligatoire (création, ou connexion à un compte existant).
// Même logique que `account-sheet.tsx` (vérification `credentials.ts`, puis `signUp` /
// `signIn`) ; à la réussite, la session apparaît dans `account-store` et l'écran
// d'onboarding renvoie à l'accueil.
import * as Haptics from 'expo-haptics';
import { type ComponentRef, useRef, useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Pressable, ScrollView, TextInput, useColorScheme, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { credentialsError, PASSWORD_RULE } from '@/lib/credentials';
import { CONTROL_HEIGHT, RADIUS } from '@/lib/design';
import { signIn, signUp } from '@/lib/sync/account';
import { THEME } from '@/lib/theme';

const ICON = require('../../../assets/images/icon.png');

export function AccountStep() {
  const insets = useSafeAreaInsets();
  const colors = THEME[useColorScheme() === 'dark' ? 'dark' : 'light'];
  const [creating, setCreating] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const passwordRef = useRef<ComponentRef<typeof TextInput>>(null);

  const submit = async () => {
    if (loading) return;
    const invalid = credentialsError(email, password, creating);
    if (invalid) {
      setError(invalid);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await (creating ? signUp : signIn)(email.trim(), password);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const field = {
    height: CONTROL_HEIGHT,
    borderRadius: RADIUS.control,
    paddingHorizontal: 14,
    fontSize: 15,
    backgroundColor: colors.note,
    color: colors.foreground,
  };

  return (
    <KeyboardAvoidingView behavior="padding" className="flex-1 bg-background">
      <ScrollView
        contentContainerClassName="flex-grow justify-center px-7"
        contentContainerStyle={{ gap: 12, paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }}
        keyboardShouldPersistTaps="handled">
        <Image source={ICON} style={{ width: 72, height: 72, borderRadius: 20 }} />
        <View className="pb-3" style={{ gap: 8 }}>
          <Text className="text-3xl font-bold">Well done! Last step: your account</Text>
          <Text variant="muted" className="text-base">
            Your account backs up your posts and syncs them across your phones.
          </Text>
        </View>
        <TextInput
          style={field}
          placeholder="Email"
          placeholderTextColor={colors.mutedForeground}
          value={email}
          onChangeText={setEmail}
          autoComplete="email"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => passwordRef.current?.focus()}
        />
        <TextInput
          ref={passwordRef}
          style={field}
          placeholder="Password"
          placeholderTextColor={colors.mutedForeground}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete={creating ? 'new-password' : 'password'}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="go"
          onSubmitEditing={submit}
        />
        {creating && !error && (
          <Text variant="muted" className="text-xs">
            {PASSWORD_RULE}
          </Text>
        )}
        {!!error && <Text className="text-sm text-destructive">{error}</Text>}
        <Button className="mt-1 h-12 rounded-2xl" disabled={loading} onPress={submit}>
          {loading ? (
            <ActivityIndicator color={colors.primaryForeground} />
          ) : (
            <Text className="font-semibold">{creating ? 'Create account' : 'Sign in'}</Text>
          )}
        </Button>
        <Pressable
          onPress={() => {
            setCreating(!creating);
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
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
