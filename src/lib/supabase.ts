import { AppState } from 'react-native';
import Storage from 'expo-sqlite/kv-store';
import { createClient } from '@supabase/supabase-js';

/**
 * Client Supabase (compte + synchronisation, spec 2026-11-11).
 *
 * La session vit dans le magasin clé-valeur d'expo-sqlite (SQLite, conforme à
 * AGENTS.md) : pas de module natif en plus. Pas de chiffrement supplémentaire — le
 * fichier est dans le bac à sable de l'app, et Supabase le présente comme optionnel.
 */
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  throw new Error(
    'EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY manquants (.env.local ou variables EAS).'
  );
}

export const supabase = createClient(url, key, {
  auth: {
    storage: Storage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Recommandation Supabase pour React Native : ne rafraîchir le jeton qu'au premier plan.
AppState.addEventListener('change', (state) => {
  if (state === 'active') supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});
