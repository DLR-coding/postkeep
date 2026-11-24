// Appels au service IA compatible OpenAI (ARCHITECTURE.md §13).
import {
  buildSummaryRequest,
  cleanTranscript,
  httpErrorMessage,
  parseModelIds,
  readSummary,
  type AiSettings,
  type SummaryInput,
} from './ai-summary';

/** XMLHttpRequest plutôt que fetch : `xhr.timeout` est appliqué par OkHttp (`callTimeout`),
 *  donc il expire aussi app fermée, quand les timers JS sont gelés (§13). */
function request(method: 'GET' | 'POST', url: string, apiKey: string, body: string | FormData | null, timeoutMs: number) {
  return new Promise<unknown>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url);
    xhr.timeout = timeoutMs;
    xhr.setRequestHeader('authorization', `Bearer ${apiKey}`);
    if (typeof body === 'string') xhr.setRequestHeader('content-type', 'application/json');
    xhr.onload = () => {
      if (xhr.status < 200 || xhr.status >= 300) return reject(new Error(httpErrorMessage(xhr.status, xhr.responseText)));
      try {
        resolve(JSON.parse(xhr.responseText));
      } catch {
        reject(new Error('The AI service returned an unreadable answer.'));
      }
    };
    xhr.onerror = () => reject(new Error('Could not reach the AI service. Check your connection and the URL.'));
    xhr.ontimeout = () => reject(new Error('The AI service took too long to answer.'));
    xhr.send(body);
  });
}

/** Modèles proposés par le service (`GET /models`) : vérifie aussi l'URL et la clé. */
export async function listModels(baseUrl: string, apiKey: string): Promise<string[]> {
  return parseModelIds(await request('GET', `${baseUrl.trim().replace(/\/+$/, '')}/models`, apiKey.trim(), null, 20_000));
}

/** Transcription du mp4 brut (pas d'extraction audio) ; null si aucun modèle ou rien d'utile. */
export async function transcribe(settings: AiSettings, videoUri: string): Promise<string | null> {
  if (!settings.transcriptionModel) return null;
  const form = new FormData();
  form.append('model', settings.transcriptionModel);
  // Forme React Native d'un fichier dans FormData : envoyé en flux depuis le disque.
  form.append('file', { uri: videoUri, name: 'video.mp4', type: 'video/mp4' } as unknown as Blob);
  const body = await request('POST', `${settings.baseUrl}/audio/transcriptions`, settings.apiKey, form, 120_000);
  return cleanTranscript((body as { text?: string } | null)?.text);
}

export async function summarize(settings: AiSettings, input: SummaryInput): Promise<string> {
  const body = JSON.stringify(buildSummaryRequest(settings, input));
  return readSummary(await request('POST', `${settings.baseUrl}/chat/completions`, settings.apiKey, body, 180_000));
}
