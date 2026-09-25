"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// La classe scelta dalla maestra viene ricordata su questo dispositivo, così
// alle visite successive si apre subito (DESIGN.md: massimo 2 tocchi).
// localStorage può non essere disponibile (navigazione privata): try/catch.

const key = (code: string) => `classe:${code}`;
/** Ultimo istituto visitato: la home "/" (anche dall'app sulla schermata Home) lo riapre. */
export const LAST_SCHOOL_KEY = "ultima-scuola";

/** Nella pagina della classe: la ricorda. */
export function RememberClass({ code, classId }: { code: string; classId: string }) {
  useEffect(() => {
    try {
      localStorage.setItem(key(code), classId);
      localStorage.setItem(LAST_SCHOOL_KEY, code);
    } catch {}
  }, [code, classId]);
  return null;
}

/** Nella home dell'istituto: se c'è una classe ricordata (e ancora esistente) la apre. */
export function OpenRememberedClass({ code, classIds }: { code: string; classIds: string[] }) {
  const router = useRouter();
  useEffect(() => {
    try {
      localStorage.setItem(LAST_SCHOOL_KEY, code);
      const saved = localStorage.getItem(key(code));
      if (saved && classIds.includes(saved)) router.replace(`/scuola/${code}/classe/${saved}`);
    } catch {}
  }, [code, classIds, router]);
  return null;
}

/** "Cambia classe": dimentica la scelta e torna all'elenco. */
export function ChangeClassButton({ code, className }: { code: string; className?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        try {
          localStorage.removeItem(key(code));
        } catch {}
        router.push(`/scuola/${code}?scegli=1`);
      }}
    >
      Cambia classe
    </button>
  );
}

/** Nella home "/": riapre l'ultimo istituto visitato su questo dispositivo. */
export function OpenLastSchool() {
  const router = useRouter();
  useEffect(() => {
    try {
      const code = localStorage.getItem(LAST_SCHOOL_KEY);
      if (code && /^[a-z0-9-]{8,64}$/.test(code)) router.replace(`/scuola/${code}`);
    } catch {}
  }, [router]);
  return null;
}
