/** Segnaposto mostrato subito al cambio pagina (loading.tsx): il tocco ha effetto immediato. */
export function PageLoading() {
  return (
    <div className="flex animate-pulse flex-col gap-4" role="status" aria-label="Caricamento">
      <div className="h-8 w-48 rounded-xl bg-border" />
      <div className="h-32 rounded-3xl bg-card" />
      <div className="h-32 rounded-3xl bg-card" />
    </div>
  );
}
