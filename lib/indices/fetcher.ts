/**
 * Fetchers para ICL (BCRA) e IPC (INDEC via datos.gob.ar).
 * Cada función devuelve un array de { fecha: YYYY-MM-DD, valor: number }.
 *
 * ICL  → API pública del BCRA, variable 40 (diario).
 * IPC  → Serie 148.3_INIVELNAL_DICI_M_26 de la API de Series de Tiempo Argentina.
 */

export type ValorFecha = { fecha: string; valor: number };

/* ─── ICL (BCRA) ──────────────────────────────────────────────────────────── */

/**
 * Obtiene valores ICL diarios del BCRA (rango amplio; uso interno).
 */
async function fetchICLDiario(desde: string, hasta: string): Promise<ValorFecha[]> {
  const url = `https://api.bcra.gob.ar/estadisticas/v2.0/datosvariable/40/${desde}/${hasta}`;

  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    throw new Error(`BCRA API error ${res.status}: ${await res.text().catch(() => "")}`);
  }

  const json = (await res.json()) as {
    results?: { d: string; v: number }[];
  };

  return (json.results ?? []).map((r) => ({
    fecha: r.d,
    valor: Number(r.v),
  }));
}

/**
 * A partir de la serie diaria del BCRA, deja **un valor por mes** con fecha siempre `YYYY-MM-01`:
 * - Si existe cotización el día 1, se usa esa.
 * - Si no (feriado/fin de semana), se usa la primera cotización del mes.
 * Solo estos registros se persisten en `indices_economicos` (tipo ICL).
 */
export function aggregateICLToMonthlyFirst(daily: ValorFecha[]): ValorFecha[] {
  const byMonth = new Map<string, ValorFecha[]>();
  for (const p of daily) {
    const m = p.fecha.slice(0, 7);
    const arr = byMonth.get(m) ?? [];
    arr.push(p);
    byMonth.set(m, arr);
  }

  const out: ValorFecha[] = [];
  for (const [yyyymm, arr] of [...byMonth.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    arr.sort((a, b) => a.fecha.localeCompare(b.fecha));
    const exact = arr.find((x) => x.fecha.slice(8, 10) === "01");
    const chosen = exact ?? arr[0];
    out.push({ fecha: `${yyyymm}-01`, valor: chosen.valor });
  }
  return out;
}

/**
 * ICL mensual (solo día 1 de cada mes en BD): consulta BCRA y agrega a un punto por mes.
 */
export async function fetchICLMonthly(desde: string, hasta: string): Promise<ValorFecha[]> {
  const daily = await fetchICLDiario(desde, hasta);
  return aggregateICLToMonthlyFirst(daily);
}

/* ─── IPC (INDEC via datos.gob.ar) ───────────────────────────────────────── */

/**
 * Obtiene los últimos N meses del IPC general (nivel nacional, base dic 2016=100).
 * Serie: 148.3_INIVELNAL_DICI_M_26
 * Endpoint: https://apis.datos.gob.ar/series/api/series/
 */
export async function fetchIPC(limit = 24): Promise<ValorFecha[]> {
  const params = new URLSearchParams({
    ids: "148.3_INIVELNAL_DICI_M_26",
    limit: String(limit),
    sort: "desc",
    format: "json",
  });

  const url = `https://apis.datos.gob.ar/series/api/series/?${params}`;

  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    throw new Error(`INDEC API error ${res.status}: ${await res.text().catch(() => "")}`);
  }

  const json = (await res.json()) as {
    data?: [string, number | null][];
  };

  return (json.data ?? [])
    .filter(([, v]) => v != null)
    .map(([d, v]) => ({
      fecha: d.slice(0, 7) + "-01", // YYYY-MM → YYYY-MM-01
      valor: Number(v),
    }))
    .reverse(); // más antiguo primero
}
