/**
 * Extraction de métadonnées og:* via WebView cachée.
 *
 * Instagram et TikTok ne servent pas les balises og:* à un simple fetch (même avec
 * User-Agent mobile), mais les rendent côté client via JavaScript. Cette approche
 * charge la page dans une WebView invisible, attend le rendu, puis extrait les
 * métadonnées via injection JS.
 *
 * Usage :
 * 1. Ajouter <MetadataExtractorProvider> dans _layout.tsx
 * 2. Appeler const { extractMetadata } = useExtractMetadata()
 * 3. const result = await extractMetadata(url)
 */

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

// shortcut: react-native-webview 14.0.1 déclare `class WebView<P = undefined>` dans ses types
// racine, et `WebViewProps & undefined` vaut `never` (aucune prop acceptée). On fixe P à
// `object` (le défaut de la v13) ; à retirer quand les types upstream seront corrigés.
const ExtractorWebView = WebView<object>;
type ExtractorWebViewInstance = WebView<object>;

export type ExtractedMetadata = {
  caption: string | null;
  thumbnailUrl: string | null;
};

const EMPTY: ExtractedMetadata = { caption: null, thumbnailUrl: null };
const TIMEOUT_MS = 10_000;

// User-Agent mobile pour forcer le rendu mobile (Instagram/TikTok servent du
// contenu différent selon le User-Agent).
const MOBILE_USER_AGENT =
  'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';

/**
 * Script injecté après le chargement de la page. Instagram/TikTok injectent les
 * balises og:* dynamiquement via JavaScript après le DOMContentLoaded initial.
 * On attend jusqu'à 5s que og:image apparaisse (polling toutes les 200ms).
 *
 * `id` : numéro de la requête, renvoyé dans le message. Instagram déclenche `onLoadEnd` deux
 * fois, donc deux scripts et deux messages : sans ce numéro, le second répondait à la requête
 * suivante (le post suivant recevait la légende et la miniature du précédent).
 */
const injectedJs = (id: number) => `
(function() {
  function getMeta(property) {
    const el = document.querySelector('meta[property="' + property + '"]') ||
               document.querySelector('meta[name="' + property + '"]');
    return el ? el.getAttribute('content') : null;
  }

  function extract() {
    const ogImage = getMeta('og:image');
    const ogDescription = getMeta('og:description');
    const ogTitle = getMeta('og:title');
    const caption = ogDescription || ogTitle || null;
    return { ogImage, caption };
  }

  function send(data) {
    window.ReactNativeWebView.postMessage(JSON.stringify({
      type: 'metadata',
      id: ${id},
      caption: data.caption,
      thumbnailUrl: data.ogImage
    }));
  }

  // Polling : attendre que og:image apparaisse (Instagram/TikTok l'injectent après)
  let attempts = 0;
  const maxAttempts = 25; // 25 × 200ms = 5s
  const interval = setInterval(function() {
    attempts++;
    const data = extract();
    if (data.ogImage || attempts >= maxAttempts) {
      clearInterval(interval);
      send(data);
    }
  }, 200);
})();
true;
`;

type ExtractRequest = {
  id: number;
  resolve: (result: ExtractedMetadata) => void;
  reject: (error: Error) => void;
  timeoutId: ReturnType<typeof setTimeout>;
};

type MetadataExtractorContextValue = {
  extractMetadata: (url: string) => Promise<ExtractedMetadata>;
};

const MetadataExtractorContext = createContext<MetadataExtractorContextValue | null>(null);

export function MetadataExtractorProvider({ children }: { children: ReactNode }) {
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);
  const pendingRequest = useRef<ExtractRequest | null>(null);
  const webViewRef = useRef<ExtractorWebViewInstance>(null);
  const lastRequestId = useRef(0);

  const handleMessage = useCallback((event: WebViewMessageEvent) => {
    console.log('[WebView] onMessage:', event.nativeEvent.data.slice(0, 200));
    if (!pendingRequest.current) return;

    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'metadata' && data.id !== pendingRequest.current.id) {
        console.log('[WebView] Ignoring a message from a previous request');
      } else if (data.type === 'metadata') {
        console.log('[WebView] Metadata extracted:', { caption: data.caption?.slice(0, 50), thumbnailUrl: data.thumbnailUrl?.slice(0, 80) });
        const { resolve, timeoutId } = pendingRequest.current;
        clearTimeout(timeoutId);
        pendingRequest.current = null;
        setCurrentUrl(null);
        resolve({
          caption: data.caption ?? null,
          thumbnailUrl: data.thumbnailUrl ?? null,
        });
      }
    } catch {
      // Message non JSON ou inattendu — ignorer
    }
  }, []);

  const handleError = useCallback((syntheticEvent: { nativeEvent: { description?: string; code?: number } }) => {
    console.log('[WebView] Error:', syntheticEvent.nativeEvent);
    if (!pendingRequest.current) return;

    // Résoudre à vide plutôt que rejeter : un échec de récupération ne doit
    // jamais empêcher la sauvegarde (le formulaire n'attrape pas d'erreur).
    const { resolve, timeoutId } = pendingRequest.current;
    clearTimeout(timeoutId);
    pendingRequest.current = null;
    setCurrentUrl(null);
    resolve(EMPTY);
  }, []);

  const extractMetadata = useCallback((url: string): Promise<ExtractedMetadata> => {
    console.log('[WebView] extractMetadata called for:', url);
    // Une seule extraction à la fois, la plus récente gagne : un partage qui arrive
    // pendant un rattrapage en arrière-plan passe devant (le rattrapage reçoit vide).
    if (pendingRequest.current) {
      console.log('[WebView] Replacing the request in progress');
      clearTimeout(pendingRequest.current.timeoutId);
      pendingRequest.current.resolve(EMPTY);
      pendingRequest.current = null;
    }

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        console.log('[WebView] Timeout reached for:', url);
        if (pendingRequest.current) {
          pendingRequest.current = null;
          setCurrentUrl(null);
          resolve(EMPTY); // Timeout → retourner vide plutôt qu'erreur
        }
      }, TIMEOUT_MS);

      lastRequestId.current += 1;
      pendingRequest.current = { id: lastRequestId.current, resolve, reject, timeoutId };
      setCurrentUrl(url);
    });
  }, []);

  return (
    <MetadataExtractorContext.Provider value={{ extractMetadata }}>
      {children}
      {/* WebView cachée, positionnée hors écran */}
      <View style={styles.hidden} pointerEvents="none">
        {currentUrl && (
          <ExtractorWebView
            // Remontée à chaque URL (page précédente détruite). Les messages déjà partis
            // de cette page sont écartés par leur numéro de requête (`injectedJs`).
            key={currentUrl}
            ref={webViewRef}
            source={{ uri: currentUrl }}
            userAgent={MOBILE_USER_AGENT}
            onLoadEnd={() => {
              console.log('[WebView] Page loaded, injecting script');
              // Injecter le script d'extraction après le chargement complet
              const id = pendingRequest.current?.id;
              if (id !== undefined) webViewRef.current?.injectJavaScript(injectedJs(id));
            }}
            onMessage={handleMessage}
            onError={handleError}
            onHttpError={handleError}
            // Désactiver les interactions et optimiser pour l'extraction
            javaScriptEnabled
            domStorageEnabled
            sharedCookiesEnabled={false}
            incognito
            cacheEnabled={false}
            // La page Instagram redirige vers `instagram://media/…` : react-native-webview
            // ouvre via `Linking` toute URL hors `originWhitelist`, ce qui lançait l'app
            // Instagram par-dessus PostKeep et gelait l'extraction. On laisse tout passer
            // la liste blanche et on refuse ici, sans rien ouvrir, ce qui n'est pas du web.
            originWhitelist={['*']}
            onShouldStartLoadWithRequest={({ url }) => /^(https?|about):/.test(url)}
            // Pas de media autoplay
            mediaPlaybackRequiresUserAction
            allowsInlineMediaPlayback={false}
          />
        )}
      </View>
    </MetadataExtractorContext.Provider>
  );
}

export function useExtractMetadata(): MetadataExtractorContextValue {
  const context = useContext(MetadataExtractorContext);
  if (!context) {
    throw new Error('useExtractMetadata must be used within MetadataExtractorProvider');
  }
  return context;
}

const styles = StyleSheet.create({
  hidden: {
    position: 'absolute',
    width: 1,
    height: 1,
    left: -9999,
    top: -9999,
    opacity: 0,
  },
});
