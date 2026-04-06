/**
 * IPC (variación mensual %) vía API oficial Series de Tiempo — datos.gob.ar
 * Serie: 148.3_INIVAR_2016_M_21
 */

export type IPCMesDato = { fecha: string; valor: number };

const SERIE_IPC = "148.3_INIVAR_2016_M_21";

/** Fecha de la API (típ. fin de mes) → primer día del mes (clave en BD). */
function normalizarMesPrimero(fechaApi: string): string {
  const yyyymm = fechaApi.slice(0, 7);
  return `${yyyymm}-01`;
}

/**
 * Últimos `last` registros de inflación mensual (%).
 */
export async function getIPCData(last = 12): Promise<IPCMesDato[]> {
  const params = new URLSearchParams({
    ids: SERIE_IPC,
    format: "json",
    last: String(last),
  });

  const url = `https://apis.datos.gob.ar/series/api/series/?${params}`;

  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    throw new Error(`datos.gob.ar IPC ${res.status}: ${await res.text().catch(() => "")}`);
  }

  const json = (await res.json()) as {
    data?: [string, number | null][];
  };

  const rows = (json.data ?? [])
    .filter((x): x is [string, number] => x[1] != null && Number.isFinite(Number(x[1])))
    .map(([d, v]) => ({
      fecha: normalizarMesPrimero(d),
      valor: Number(v),
    }));

  rows.sort((a, b) => a.fecha.localeCompare(b.fecha));
  return rows;
}
