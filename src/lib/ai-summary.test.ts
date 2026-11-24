import test from 'node:test';
import assert from 'node:assert/strict';

import {
  aiSettingsSummary,
  buildSummaryRequest,
  cleanTranscript,
  httpErrorMessage,
  parseModelIds,
  readSummary,
  validateAiSettings,
  type AiSettings,
} from './ai-summary.ts';

const settings: AiSettings = {
  baseUrl: 'https://ai.example.com/v1',
  apiKey: 'sk-test',
  videoModel: 'Qwen/Qwen3.5-35B-A3B',
  transcriptionModel: 'openai/whisper-large-v3',
  language: 'fr',
};

test('validateAiSettings normalise et refuse http, clé ou modèle vides', () => {
  assert.deepEqual(
    validateAiSettings({ ...settings, baseUrl: ' https://ai.example.com/v1// ', transcriptionModel: '  ' }),
    { ...settings, transcriptionModel: null }
  );
  assert.throws(() => validateAiSettings({ ...settings, baseUrl: 'http://ai.example.com/v1' }), /https/);
  assert.throws(() => validateAiSettings({ ...settings, apiKey: ' ' }), /API key/);
  assert.throws(() => validateAiSettings({ ...settings, videoModel: '' }), /video model/);
});

test('aiSettingsSummary : hôte et modèle, ou Off', () => {
  assert.equal(aiSettingsSummary(settings), 'ai.example.com · Qwen/Qwen3.5-35B-A3B');
  assert.equal(aiSettingsSummary(null), 'Off');
});

test('parseModelIds trie les identifiants et refuse une réponse sans liste', () => {
  assert.deepEqual(parseModelIds({ data: [{ id: 'b' }, { id: 'a' }, { nope: 1 }] }), ['a', 'b']);
  assert.throws(() => parseModelIds({ detail: 'Not Found' }), /model list/);
});

test('cleanTranscript ignore la musique seule et un mot isolé', () => {
  assert.equal(cleanTranscript(' ♪ ♪'), null);
  assert.equal(cleanTranscript(' 🎵  ♪♪ ♪♪  ♪  you'), null);
  assert.equal(cleanTranscript(null), null);
  assert.equal(cleanTranscript(" Aujourd'hui, je vous montre ♪ le parc."), "Aujourd'hui, je vous montre le parc.");
});

test('buildSummaryRequest : langue, contexte, vidéo en base64 et raisonnement coupé', () => {
  const body = buildSummaryRequest(settings, {
    videoBase64: 'AAAA',
    transcript: 'On y trouve des chênes centenaires.',
    caption: 'The Moon understood the assignment',
    note: '  ',
  });
  assert.equal(body.model, 'Qwen/Qwen3.5-35B-A3B');
  assert.deepEqual(body.chat_template_kwargs, { enable_thinking: false });
  assert.match(body.messages[0].content as string, /in French/);
  const [text, video] = body.messages[1].content as { type: string; text?: string; video_url?: { url: string } }[];
  assert.equal(
    text.text,
    'Post caption: The Moon understood the assignment\nTranscript of the audio: On y trouve des chênes centenaires.'
  );
  assert.equal(video.video_url?.url, 'data:video/mp4;base64,AAAA');
});

test('readSummary renvoie le texte et refuse une réponse vide', () => {
  assert.equal(readSummary({ choices: [{ message: { content: '  Une fusée.  ' } }] }), 'Une fusée.');
  assert.throws(() => readSummary({ choices: [{ message: { content: null } }] }), /empty/);
});

test('httpErrorMessage : clé refusée, 404, détail tronqué', () => {
  assert.match(httpErrorMessage(401, ''), /API key/);
  assert.match(httpErrorMessage(404, ''), /\/v1/);
  assert.equal(httpErrorMessage(500, 'boom'), 'The AI service answered 500: boom.');
});
