/** Résultat d'une validation : messages en français par champ, réutilisés par l'admin et les fonctions serveur. */
export type ValidationResult<T> = { ok: true; value: T } | { ok: false; errors: Record<string, string> };

export function result<T>(value: T, errors: Record<string, string>): ValidationResult<T> {
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, value };
}
