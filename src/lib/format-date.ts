/** Date courte d'un post dans la liste : « 8 Nov », avec l'année seulement si ce n'est
 *  pas l'année en cours (« 3 Mar 2025 »). Logique pure, testée par `format-date.test.ts`. */
const SAME_YEAR = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' });
const OTHER_YEAR = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

export function formatPostDate(date: Date, now: Date = new Date()): string {
  return (date.getFullYear() === now.getFullYear() ? SAME_YEAR : OTHER_YEAR).format(date);
}
