// PROTOTYPE — jetable. Pièces communes aux 5 variantes de l'onboarding.
// Partage et détection du post réels ; compte factice (aucun compte créé).
import { max } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { Check, Pin } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Linking, Pressable, Share, TextInput, View, useColorScheme } from 'react-native';

import { PlatformSticker } from '@/components/platform-sticker';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { db, schema } from '@/db';
import type { Platform } from '@/lib/share-url';
import { THEME } from '@/lib/theme';

export const PLATFORMS: Platform[] = ['instagram', 'tiktok', 'x', 'threads', 'reddit'];

const PLATFORM_URL: Record<Platform, string> = {
  instagram: 'https://www.instagram.com',
  tiktok: 'https://www.tiktok.com',
  x: 'https://x.com',
  threads: 'https://www.threads.net',
  reddit: 'https://www.reddit.com',
};

/** Post de test du coach : public, très connu (peu de risque de suppression), et il se
 *  partage exactement comme un reel. shortcut: remplacer par un vrai reel choisi avant la
 *  mise en production. */
export const TEST_POST_URL = 'https://www.instagram.com/p/BsOGulcndj-/';

const lastSavedQuery = db.select({ at: max(schema.posts.updatedAt) }).from(schema.posts);

export type VariantProps = { onStep: (label: string) => void };

export function useColors() {
  return THEME[useColorScheme() === 'dark' ? 'dark' : 'light'];
}

/** Ouvre la vraie feuille de partage Android depuis PostKeep, pour épingler PostKeep sans
 *  quitter l'app. À vérifier sur appareil : PostKeep apparaît-il dans sa propre feuille ? */
export function openShareMenu() {
  Share.share({ message: 'https://postkeep.app' }).catch(() => {});
}

/** Maquette de la feuille de partage Android, PostKeep mis en avant. */
export function FakeShareSheet({ showPin, compact }: { showPin?: boolean; compact?: boolean }) {
  const colors = useColors();
  const others = [
    { label: 'Messages', color: '#3b82f6' },
    { label: 'Gmail', color: '#ea4335' },
    { label: 'Drive', color: '#10b981' },
  ];
  const size = compact ? 40 : 52;
  return (
    <View className="w-full rounded-3xl border border-border bg-card p-4" style={{ gap: 12 }}>
      <View className="h-1 w-10 self-center rounded-full bg-border" />
      <Text className="text-sm font-semibold">Share</Text>
      <View className="flex-row justify-between">
        {others.slice(0, 1).map((o) => (
          <FakeApp key={o.label} {...o} size={size} />
        ))}
        <View className="items-center" style={{ gap: 4 }}>
          <View
            style={{ width: size + 8, height: size + 8, borderRadius: (size + 8) / 2, borderWidth: 3, borderColor: colors.foreground }}
            className="items-center justify-center">
            <Image source={require('../../../assets/images/icon.png')} style={{ width: size, height: size, borderRadius: size / 2 }} />
            {showPin && (
              <View className="absolute -right-1 -top-1 h-6 w-6 items-center justify-center rounded-full bg-primary">
                <Icon as={Pin} size={13} color={colors.primaryForeground} />
              </View>
            )}
          </View>
          <Text className="text-xs font-semibold">PostKeep</Text>
        </View>
        {others.slice(1).map((o) => (
          <FakeApp key={o.label} {...o} size={size} />
        ))}
      </View>
      {showPin && (
        <View className="self-center rounded-full bg-primary px-3 py-1.5">
          <Text className="text-xs font-semibold text-primary-foreground">Long-press PostKeep → Pin</Text>
        </View>
      )}
    </View>
  );
}

function FakeApp({ label, color, size }: { label: string; color: string; size: number }) {
  return (
    <View className="items-center opacity-50" style={{ gap: 4, paddingTop: 4 }}>
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }} />
      <Text className="text-xs">{label}</Text>
    </View>
  );
}

/** Rangée des 5 plateformes : ouvre l'URL https (l'app si installée, sinon le navigateur). */
export function PlatformRow({ onPick }: { onPick: (p: Platform) => void }) {
  return (
    <View className="flex-row justify-center" style={{ gap: 14 }}>
      {PLATFORMS.map((p) => (
        <Pressable
          key={p}
          onPress={() => {
            onPick(p);
            Linking.openURL(PLATFORM_URL[p]).catch(() => {});
          }}
          className="active:opacity-60"
          accessibilityRole="button"
          accessibilityLabel={p}>
          <PlatformSticker platform={p} size="md" />
        </Pressable>
      ))}
    </View>
  );
}

/** Attente du premier post : détecte un vrai enregistrement (nouveau ou repartagé).
 *  Le bouton pointillé reste en secours. */
export function WaitingForPost({ onArrived }: { onArrived: () => void }) {
  const colors = useColors();
  const { data } = useLiveQuery(lastSavedQuery);
  const at = data?.[0]?.at?.valueOf() ?? null;
  const baseline = useRef<number | null | undefined>(undefined);

  useEffect(() => {
    if (!data) return;
    if (baseline.current === undefined) baseline.current = at;
    else if (at !== baseline.current) {
      baseline.current = at;
      onArrived();
    }
  }, [data, at, onArrived]);

  return (
    <View className="items-center" style={{ gap: 10 }}>
      <View className="flex-row items-center" style={{ gap: 8 }}>
        <ActivityIndicator color={colors.mutedForeground} />
        <Text variant="muted">Waiting for your first post…</Text>
      </View>
      <Pressable onPress={onArrived} className="rounded-full border border-dashed border-border px-3 py-1.5 active:opacity-60">
        <Text className="text-xs text-muted-foreground">PROTOTYPE · simulate: post saved</Text>
      </Pressable>
    </View>
  );
}

export function SavedBadge() {
  const colors = useColors();
  return (
    <View className="items-center" style={{ gap: 8 }}>
      <View className="h-16 w-16 items-center justify-center rounded-full bg-primary">
        <Icon as={Check} size={32} color={colors.primaryForeground} />
      </View>
      <Text className="text-lg font-semibold">Saved!</Text>
    </View>
  );
}

/** Formulaire de compte factice : mêmes champs et même bascule que `account-sheet.tsx`.
 *  Pas de « Not now » : le compte est obligatoire pour commencer à enregistrer. */
export function AccountFields({ onDone, cta }: { onDone: () => void; cta?: string }) {
  const colors = useColors();
  const [creating, setCreating] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const field = 'h-12 rounded-2xl border border-border bg-card px-4 text-base text-foreground';
  return (
    <View className="w-full" style={{ gap: 10 }}>
      <TextInput
        className={field}
        placeholder="Email"
        placeholderTextColor={colors.mutedForeground}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        className={field}
        placeholder={creating ? 'Password (8+ characters)' : 'Password'}
        placeholderTextColor={colors.mutedForeground}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <Button className="h-12 rounded-2xl" onPress={onDone}>
        <Text className="font-semibold">{creating ? (cta ?? 'Create account') : 'Sign in'}</Text>
      </Button>
      <Pressable onPress={() => setCreating(!creating)} className="items-center py-2 active:opacity-60">
        <Text variant="muted" className="text-sm">
          {creating ? 'Already have an account? ' : 'New here? '}
          <Text className="text-sm font-semibold">{creating ? 'Sign in' : 'Create an account'}</Text>
        </Text>
      </Pressable>
    </View>
  );
}

/** Fin du flux dans le prototype : l'app réelle irait sur l'accueil. */
export function FlowDone({ onRestart }: { onRestart: () => void }) {
  return (
    <View className="flex-1 items-center justify-center px-8" style={{ gap: 16 }}>
      <Text className="text-center text-xl font-semibold">Onboarding done</Text>
      <Text variant="muted" className="text-center">The real app would now open the home screen.</Text>
      <Button variant="outline" onPress={onRestart}>
        <Text>Restart this variant</Text>
      </Button>
    </View>
  );
}
