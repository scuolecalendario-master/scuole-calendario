/**
 * Dati di una lettura Supabase. Se il database risponde con un errore lo
 * rilancia: la pagina mostra "Riprova" invece di un elenco vuoto, che farebbe
 * credere che le lezioni siano sparite.
 */
export function orThrow<R extends { data: unknown; error: { message: string } | null }>(
  result: R,
): Extract<R, { error: null }>["data"] {
  if (result.error) throw new Error(`Lettura dal database non riuscita: ${result.error.message}`);
  return result.data as Extract<R, { error: null }>["data"];
}
