import { addDatabaseChangeListener } from 'expo-sqlite';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { supabase } from '@/lib/supabase';
import { requestSync } from '@/lib/sync/account';
import { hasLocalChanges } from '@/lib/sync/engine';
import { useAccountStore } from '@/stores/account-store';

const WRITE_DELAY_MS = 3000;

/**
 * Session → `account-store`, et déclencheurs de synchro tant qu'un compte est connecté :
 * au lancement (et à la connexion), au retour au premier plan, et 3 s après une écriture
 * locale. Monté une fois dans `_layout.tsx` ; `ready` = migrations passées.
 */
export function useAccountSync(ready: boolean): void {
  const userId = useAccountStore((state) => state.userId);

  useEffect(() => {
    // Pas d'appel Supabase dans ce rappel (verrou de session interne) : seulement l'état.
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      useAccountStore.setState({ userId: session?.user.id ?? null, email: session?.user.email ?? null });
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!ready || !userId) return;
    requestSync();
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') requestSync();
    });
    let timer: ReturnType<typeof setTimeout> | undefined;
    const dbChanges = addDatabaseChangeListener(() => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (hasLocalChanges(userId)) requestSync();
      }, WRITE_DELAY_MS);
    });
    return () => {
      appState.remove();
      dbChanges.remove();
      clearTimeout(timer);
    };
  }, [ready, userId]);
}
