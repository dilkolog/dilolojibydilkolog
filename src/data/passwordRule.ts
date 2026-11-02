/**
 * The password rule the sign-up asks for. It mirrors Supabase's Email provider setting (Authentication → Providers →
 * Email: minimum length 8 and "lowercase, uppercase letters, digits and symbols"), so a weak password is explained
 * on the form instead of coming back from the server as a vague refusal. If that setting is relaxed, relax this too.
 */
export const PASSWORD_HINT = 'En az 8 karakter; büyük harf, küçük harf, rakam ve sembol (örn. ! ? . -) olsun.'

/** What is missing from a new password, in Turkish, or '' when it is fine. */
export function passwordProblem(password: string): string {
  if (password.length < 8) return 'Şifre en az 8 karakter olmalı.'
  const missing: string[] = []
  if (!/\p{Ll}/u.test(password)) missing.push('küçük harf')
  if (!/\p{Lu}/u.test(password)) missing.push('büyük harf')
  if (!/\d/.test(password)) missing.push('rakam')
  if (!/[^\p{L}\d]/u.test(password)) missing.push('sembol (! ? . - gibi)')
  return missing.length ? `Şifrede ${missing.join(', ')} da olmalı.` : ''
}
