/** Date courte d'un post dans la liste : « 8 Nov », avec l'année seulement si ce n'est
 *  pas l'année en cours (« 3 Mar 2025 »). Logique pure, testée par `format-date.test.ts`.
 *  Mois écrits à la main : `Intl` en `en-GB` donne « Sept » pour septembre. */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatPostDate(date: Date, now: Date = new Date()): string {
  const day = `${date.getDate()} ${MONTHS[date.getMonth()]}`;
  return date.getFullYear() === now.getFullYear() ? day : `${day} ${date.getFullYear()}`;
}
