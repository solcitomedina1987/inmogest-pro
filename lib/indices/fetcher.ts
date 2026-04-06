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
 * Obtiene valores ICL del BCRA entre dos fechas.
 * Endpoint: https://api.bcra.gob.ar/estadisticas/v2.0/datosvariable/40/{desde}/{hasta}
 * Devuelve valores diarios.
 */
export async function fetchICL(desde: string, hasta: string): Promise<ValorFecha[]> {
  const url = `https://api.bcra.gob.ar/estadisticas/v2.0/datosvariable/40/${desde}/${hasta}`;

  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    next: { revalidate: 0 }, // sin caché en Next.js
  });

  if (!res.ok) {
    throw new Error(`BCRA API error ${res.status}: ${await res.text().catch(() => "")}`);
  }

  const json = (await res.json()) as {
    results?: { d: string; v: number }[];
  };

  return (json.results ?? []).map((r) => ({
    fecha: r.d,   // YYYY-MM-DD
    valor: Number(r.v),
  }));
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
