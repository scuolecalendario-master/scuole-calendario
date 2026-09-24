// Utility per i form gestiti con Server Actions + useActionState.

export type ActionState = { error?: string; success?: string };

export class FormError extends Error {}

export function readText(
  formData: FormData,
  key: string,
  { label, required = false, max = 200 }: { label: string; required?: boolean; max?: number },
): string | null {
  const value = String(formData.get(key) ?? "").trim();
  if (!value) {
    if (required) throw new FormError(`${label}: campo obbligatorio.`);
    return null;
  }
  if (value.length > max) throw new FormError(`${label}: massimo ${max} caratteri.`);
  return value;
}

export function readEmail(
  formData: FormData,
  key: string,
  { label, required = false }: { label: string; required?: boolean },
): string | null {
  const value = readText(formData, key, { label, required, max: 254 });
  if (value == null) return null;
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)) {
    throw new FormError(`${label}: indirizzo email non valido.`);
  }
  return value.toLowerCase();
}

export function readInt(
  formData: FormData,
  key: string,
  { label, min = 0, max = 10_000 }: { label: string; min?: number; max?: number },
): number {
  const raw = String(formData.get(key) ?? "").trim();
  const value = Number(raw);
  if (!raw || !Number.isInteger(value) || value < min || value > max) {
    throw new FormError(`${label}: inserisci un numero intero tra ${min} e ${max}.`);
  }
  return value;
}

/** Traduce gli errori Postgres/PostgREST più comuni in messaggi leggibili. */
export function dbErrorMessage(
  error: { code?: string; message: string },
  messages: { unique?: string } = {},
): string {
  switch (error.code) {
    case "23505":
      return messages.unique ?? "Esiste già un elemento con questi dati.";
    case "23514":
      return error.message;
    case "42501":
      return "Operazione non consentita.";
    default:
      return "Si è verificato un errore, riprova.";
  }
}

/** Esegue il corpo dell'action convertendo FormError in stato di errore. */
export async function handleForm(fn: () => Promise<ActionState | void>): Promise<ActionState> {
  try {
    return (await fn()) ?? {};
  } catch (e) {
    if (e instanceof FormError) return { error: e.message };
    throw e; // redirect() e errori imprevisti
  }
}
