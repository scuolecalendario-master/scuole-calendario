// CSV pensato per Excel in italiano: separatore ";", decimali con la virgola,
// BOM UTF-8 così gli accenti vengono letti correttamente.

type Cell = string | number | null | undefined;

const decimal = new Intl.NumberFormat("it-IT", {
  maximumFractionDigits: 2,
  useGrouping: false,
});

function escapeCell(value: Cell): string {
  if (value == null) return "";
  let s = typeof value === "number" ? decimal.format(value) : value;
  // Evita la formula injection quando il file viene aperto in Excel
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[";\r\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
}

export function toCSV(header: string[], rows: Cell[][]): string {
  return "﻿" + [header, ...rows].map((r) => r.map(escapeCell).join(";")).join("\r\n");
}

export function csvResponse(csv: string, filename: string) {
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
