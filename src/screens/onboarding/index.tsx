// Onboarding (forme « G » du prototype, retenue le 19 novembre 2026) :
// 1. bienvenue → 2. épingler PostKeep (animation + vraie feuille de partage) → « All set! » →
// 3. test simulé du partage → « Saved! » → 4. compte obligatoire.
// Ouvert par la barrière du compte (`_layout.tsx`) tant qu'il n'y a pas de session ; après
// une déconnexion (tutoriel déjà vu), directement à l'étape du compte. `replay` : rejoué
// depuis les Paramètres par un utilisateur connecté, sans l'étape du compte.
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

import { loadTutorialSeen, saveTutorialSeen } from '@/lib/settings';
import { useAccountStore } from '@/stores/account-store';

import { AccountStep } from './account-step';
import { DoneStep } from './done-step';
import { PinStep } from './pin-step';
import { ShareTutorial } from './share-tutorial';
import { WelcomeStep } from './welcome-step';

type Stage = 'welcome' | 'pin' | 'pinDone' | 'test' | 'testDone' | 'account';

export function OnboardingScreen({ replay }: { replay: boolean }) {
  const router = useRouter();
  const userId = useAccountStore((s) => s.userId);
  const [stage, setStage] = useState<Stage>(() => (!replay && loadTutorialSeen() ? 'account' : 'welcome'));

  // Compte créé ou connecté : direction l'accueil.
  useEffect(() => {
    if (!replay && userId) router.replace('/');
  }, [replay, userId, router]);

  const toAccount = () => {
    if (replay) {
      router.back();
      return;
    }
    saveTutorialSeen();
    setStage('account');
  };

  switch (stage) {
    case 'welcome':
      return <WelcomeStep onNext={() => setStage('pin')} onSkip={toAccount} />;
    case 'pin':
      return <PinStep onContinue={() => setStage('pinDone')} />;
    case 'pinDone':
      return <DoneStep title="All set!" body="PostKeep is now easy to find when you share." onNext={() => setStage('test')} />;
    case 'test':
      return <ShareTutorial onDone={() => setStage('testDone')} onSkip={toAccount} />;
    case 'testDone':
      return <DoneStep title="Saved!" body="That’s how you save a post. Easy!" onNext={toAccount} />;
    case 'account':
      return <AccountStep />;
  }
}
