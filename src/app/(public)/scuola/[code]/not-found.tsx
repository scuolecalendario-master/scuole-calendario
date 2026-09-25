import Link from "next/link";

// Codice inesistente o rigenerato dalla scuola: da qui si inserisce quello nuovo
// (?codice=nuovo evita che la home riapra il vecchio istituto ricordato).
export default function SchoolNotFound() {
  return (
    <main className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-bold">Codice non valido</h1>
      <p className="text-muted-foreground">
        Il link non funziona più: forse la scuola ha ricevuto un codice nuovo. Chiedilo alla tua scuola e inseriscilo
        qui.
      </p>
      <Link
        href="/?codice=nuovo"
        className="flex min-h-11 items-center rounded-xl bg-primary px-5 font-semibold text-primary-foreground"
      >
        Inserisci il nuovo codice
      </Link>
    </main>
  );
}
