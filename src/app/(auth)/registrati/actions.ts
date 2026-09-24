"use server";

import { redirect } from "next/navigation";

import { homeForRole } from "@/lib/auth";
import { FormError, handleForm, readEmail, readText, type ActionState } from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";

const MIN_PASSWORD = 8;

export type RegisterState = ActionState & {
  /** Valori già inseriti, per non doverli riscrivere dopo un errore (mai la password). */
  values?: { code: string; full_name: string; email: string };
};

export async function register(_prev: RegisterState, formData: FormData): Promise<RegisterState> {
  let home: string | undefined;

  const state = await handleForm(async () => {
    const code = readText(formData, "code", { label: "Codice", required: true, max: 40 })!;
    const fullName = readText(formData, "full_name", { label: "Nome e cognome", required: true, max: 120 })!;
    const email = readEmail(formData, "email", { label: "Email", required: true })!;
    const password = String(formData.get("password") ?? "");
    if (password.length < MIN_PASSWORD) {
      throw new FormError(`La password deve avere almeno ${MIN_PASSWORD} caratteri.`);
    }

    const supabase = await createClient();

    // 1. Controlla il codice prima di creare l'account
    const { data: valid, error: checkError } = await supabase.rpc("check_registration_code", {
      p_code: code,
    });
    if (checkError) throw new FormError("Errore di connessione, riprova.");
    if (!valid) throw new FormError("Codice non valido, già usato o scaduto.");

    // 2. Crea l'account; se esiste già (es. accesso revocato in passato)
    //    accede con la password indicata e riusa quell'account.
    const { data: signUp, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });

    if (signUpError?.code === "user_already_exists") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        throw new FormError(
          "Esiste già un account con questa email: inserisci la sua password attuale.",
        );
      }
    } else if (signUpError) {
      throw new FormError(
        signUpError.code === "weak_password"
          ? "Password troppo debole: usa lettere, numeri e almeno 8 caratteri."
          : "Registrazione non riuscita, riprova.",
      );
    } else if (!signUp.session) {
      // Succede solo se su Supabase è attiva la conferma email.
      throw new FormError(
        "Registrazione in attesa di conferma email: avvisa l'amministratore (la conferma email va disattivata su Supabase).",
      );
    }

    // 3. Riscatta il codice: assegna il ruolo e lo segna come usato
    const { data: role, error: redeemError } = await supabase.rpc("redeem_registration_code", {
      p_code: code,
    });
    if (redeemError) {
      await supabase.auth.signOut();
      throw new FormError(
        redeemError.message.includes("già abilitato")
          ? "Questo account è già abilitato: accedi dalla pagina di login."
          : "Codice non valido, già usato o scaduto.",
      );
    }
    home = homeForRole(role);
  });

  if (home) redirect(home);
  return {
    ...state,
    values: {
      code: String(formData.get("code") ?? ""),
      full_name: String(formData.get("full_name") ?? ""),
      email: String(formData.get("email") ?? ""),
    },
  };
}
