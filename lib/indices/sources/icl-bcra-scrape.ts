/**
 * ICL: valor en la tabla HTML de Principales Variables del BCRA.
 * Sin token ni APIs deprecadas; parseo HTML público (si cambia el layout, ajustar regex).
 */

const BCRA_PRINCIPALES_URL =
  "https://www.bcra.gob.ar/PublicacionesEstadisticas/Principales_variables.asp";

export function primerDiaMesActualBsAs(): string {
  const ymd = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const [y, m] = ymd.split("-");
  return `${y}-${m}-01`;
}

export function parseNumeroAr(s: string): number | null {
  const t = s.trim().replace(/\s/g, "");
  if (!t) return null;
  let x = t;
  if (x.includes(",") && x.includes(".")) {
    x = x.replace(/\./g, "").replace(",", ".");
  } else if (x.includes(",")) {
    x = x.replace(",", ".");
  }
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

/**
 * Busca la fila del ICL y el primer número plausible en sus <td>.
 */
function extraerValorICLDesdeHtml(html: string): number | null {
  const filas = html.split(/<tr\b/i);
  const patron = /índice\s+para\s+contratos\s+de\s+locaci|contratos\s+de\s+locaci/i;

  for (const fila of filas) {
    const textoPlano = fila.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<[^>]+>/g, " ");
    if (!patron.test(textoPlano)) continue;

    const celdas = fila.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) ?? [];
    for (const celda of celdas) {
      const inner = celda.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      const n = parseNumeroAr(inner);
      if (n != null && n > 0 && n < 1e12) return n;
    }
  }

  return null;
}

/**
 * Devuelve ICL del mes corriente (Argentina): índice nivel y fecha YYYY-MM-01.
 */
export async function getICLData(): Promise<{ fecha: string; valor: number } | null> {
  const res = await fetch(BCRA_PRINCIPALES_URL, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; ConsultoraMedina/1.0; +https://consultoramedina.vercel.app)",
      Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
    },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    throw new Error(`BCRA principales variables HTTP ${res.status}`);
  }

  const html = await res.text();
  const valor = extraerValorICLDesdeHtml(html);
  if (valor == null) return null;

  return { fecha: primerDiaMesActualBsAs(), valor };
}
