/** Vérification des identifiants avant l'appel à Supabase (onboarding et feuille de compte).
 *  Pur, testé par `credentials.test.ts`. Le serveur doit appliquer la même règle de mot de
 *  passe (Supabase → Authentication → Email : longueur minimale et caractères requis) :
 *  cette vérification n'est qu'un confort, un appel direct à l'API la contourne. */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const PASSWORD_RULE = 'Use at least 8 characters, with an uppercase letter, a lowercase letter, a number and a symbol.';

export function isValidEmail(email: string): boolean {
  return EMAIL.test(email.trim());
}

/** Mot de passe robuste : 8 caractères ou plus, avec majuscule, minuscule, chiffre et symbole. */
export function isStrongPassword(password: string): boolean {
  return (
    password.length >= 8 &&
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /\d/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
}

/** Message d'erreur à afficher, ou `null` si on peut envoyer. La règle de robustesse ne
 *  s'applique qu'à la création : un compte existant garde le mot de passe qu'il a. */
export function credentialsError(email: string, password: string, creating: boolean): string | null {
  if (!isValidEmail(email)) return 'Enter a valid email address.';
  if (!password) return 'Enter your password.';
  if (creating && !isStrongPassword(password)) return PASSWORD_RULE;
  return null;
}
