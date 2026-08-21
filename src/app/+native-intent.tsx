import { getShareExtensionKey } from 'expo-share-intent';

export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  try {
    if (path.includes(`dataUrl=${getShareExtensionKey()}`)) {
      return '/shareintent';
    }
    return path;
  } catch (e) {
    console.error('[expo-router] Error in redirectSystemPath:', e);
    return '/';
  }
}
