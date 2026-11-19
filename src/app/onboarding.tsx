import { useLocalSearchParams } from 'expo-router';

import { OnboardingScreen } from '@/screens/onboarding';

/** `?replay=1` : rejoué depuis les Paramètres (Settings → Show tutorial), sans l'étape du compte. */
export default function OnboardingRoute() {
  const { replay } = useLocalSearchParams<{ replay?: string }>();
  return <OnboardingScreen replay={replay === '1'} />;
}
