// Dates en français pour les écrans de l'admin.
const dateFmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
const dateTimeFmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const timeFmt = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });

export const formatDate = (d: Date | null | undefined) => (d ? dateFmt.format(d) : '—');
export const formatDateTime = (d: Date | null | undefined) => (d ? dateTimeFmt.format(d) : '—');

/** « à l'instant », « il y a 5 min », « aujourd'hui 14:05 », « hier 09:12 », sinon la date. */
export function formatRelative(d: Date | null | undefined, now = new Date()): string {
  if (!d) return '—';
  const minutes = Math.round((now.getTime() - d.getTime()) / 60_000);
  if (minutes < 1) return 'à l’instant';
  if (minutes < 60) return `il y a ${minutes} min`;
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (d >= startOfDay) return `aujourd’hui ${timeFmt.format(d)}`;
  if (d >= new Date(startOfDay.getTime() - 86_400_000)) return `hier ${timeFmt.format(d)}`;
  return dateTimeFmt.format(d);
}

/** Valeur d'un <input type="date"> (heure locale). */
export function toDateInput(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
/** <input type="date"> → Date à minuit (heure locale) ; null si vide. */
export function fromDateInput(v: string): Date | null {
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
}
