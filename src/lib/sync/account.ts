import { isNotNull } from 'drizzle-orm';
import { db } from '@/db';
import { collections, postCollections, posts } from '@/db/schema';
import { supabase } from '@/lib/supabase';
import { useAccountStore } from '@/stores/account-store';

import { forgetSyncState, sync, whenIdle } from './engine';
import { authErrorMessage } from './logic';

// Contrat pour l'interface (tâche 6). Les erreurs levées portent un message en anglais
// affichable tel quel à l'utilisateur. La première synchro (fusion des données invitées)
// part des déclencheurs de `use-account-sync.ts` dès que la session apparaît.

export async function signIn(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw new Error(authErrorMessage(error));
}

export async function signUp(email: string, password: string): Promise<void> {
  const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
  if (error) throw new Error(authErrorMessage(error));
  // Confirmation d'email coupée côté projet (spec) : sans session, la config a changé.
  if (!data.session) throw new Error('Check your email to confirm your account, then sign in.');
}

/**
 * Vide le cache local du compte. Exception assumée au « jamais de vrai DELETE »
 * (spec 2026-11-11, objectif 6, et ARCHITECTURE.md) : les données restent dans le compte,
 * pierres tombales comprises ; c'est l'appareil qu'on vide, pas une suppression de données.
 */
function wipeLocalData(uid: string): void {
  // `WHERE id IS NOT NULL` toujours vrai, mais indispensable : un DELETE sans WHERE
  // passe par l'« optimisation truncate » de SQLite, qui ne prévient pas l'écouteur de
  // changements — `useLiveQuery` continuait d'afficher les posts effacés.
  db.transaction((tx) => {
    tx.delete(postCollections).where(isNotNull(postCollections.id)).run();
    tx.delete(posts).where(isNotNull(posts.id)).run();
    tx.delete(collections).where(isNotNull(collections.id)).run();
  });
  forgetSyncState(uid);
}

/** Pousse d'abord ; lève une erreur (et reste connecté) si le push échoue. */
export async function signOut(): Promise<void> {
  const uid = useAccountStore.getState().userId;
  if (!uid) return;
  if (!(await sync())) {
    throw new Error("Connect to the internet to sign out — some changes aren't synced yet.");
  }
  // `local` : la déconnexion ne doit pas dépendre du réseau une fois tout poussé.
  await supabase.auth.signOut({ scope: 'local' });
  wipeLocalData(uid);
}

export async function deleteAccount(): Promise<void> {
  const uid = useAccountStore.getState().userId;
  if (!uid) return;
  // Une synchro en vol pourrait réécrire des lignes reçues après le nettoyage.
  await whenIdle();
  const { error } = await supabase.rpc('delete_my_account');
  if (error) throw new Error(authErrorMessage(error));
  // Le jeton d'un compte supprimé reste valide jusqu'à expiration : sortie locale seulement.
  await supabase.auth.signOut({ scope: 'local' });
  wipeLocalData(uid);
}

/** Demande une synchro (sans attendre). Sans session : ne fait rien. */
export function requestSync(): void {
  void sync();
}
