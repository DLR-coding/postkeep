import test from 'node:test';
import assert from 'node:assert/strict';

import { credentialsError, isStrongPassword, isValidEmail, PASSWORD_RULE } from './credentials.ts';

test('isValidEmail : une adresse avec @ et un domaine à point, espaces autour ignorés', () => {
  assert.equal(isValidEmail('dylan@example.com'), true);
  assert.equal(isValidEmail('  dylan@example.com  '), true);
  assert.equal(isValidEmail('dylan@example'), false);
  assert.equal(isValidEmail('dylan.example.com'), false);
  assert.equal(isValidEmail('dy lan@example.com'), false);
  assert.equal(isValidEmail(''), false);
});

test('isStrongPassword : 8+ caractères avec majuscule, minuscule, chiffre et symbole', () => {
  assert.equal(isStrongPassword('Abcdef1!'), true);
  assert.equal(isStrongPassword('Abcde1!'), false); // 7 caractères
  assert.equal(isStrongPassword('abcdef1!'), false); // pas de majuscule
  assert.equal(isStrongPassword('ABCDEF1!'), false); // pas de minuscule
  assert.equal(isStrongPassword('Abcdefg!'), false); // pas de chiffre
  assert.equal(isStrongPassword('Abcdefg1'), false); // pas de symbole
});

test('credentialsError : email d’abord, puis mot de passe, règle de robustesse à la création seulement', () => {
  assert.equal(credentialsError('nope', 'Abcdef1!', true), 'Enter a valid email address.');
  assert.equal(credentialsError('a@b.co', '', false), 'Enter your password.');
  assert.equal(credentialsError('a@b.co', 'weak', true), PASSWORD_RULE);
  assert.equal(credentialsError('a@b.co', 'weak', false), null); // connexion : ancien mot de passe accepté
  assert.equal(credentialsError('a@b.co', 'Abcdef1!', true), null);
});
