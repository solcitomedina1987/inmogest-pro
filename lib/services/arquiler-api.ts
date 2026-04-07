/**
 * Cliente HTTP para Arquiler API vía RapidAPI (GET /stats).
 * La clave debe ir en RAPIDAPI_ARQUILER_KEY (nunca en el código).
 */

const RAPIDAPI_HOST = "arquilerapi1.p.rapidapi.com";
const STATS_URL = `https://${RAPIDAPI_HOST}/stats`;

export type PuntoICLArquiler = { fecha: string; valor: number };

function getApiKey(): string | null {
  const k = process.env.RAPIDAPI_ARQUILER_KEY?.trim();
  return k || null;
}

function normalizarFecha(raw: string): string | null {
  const s = String(raw).trim().slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const d = m[1].padStart(2, "0");
    const mo = m[2].padStart(2, "0");
    const y = m[3];
    return `${y}-${mo}-${d}`;
  }
  return null;
}

function extraerNumero(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const t = v.trim().replace(/\s/g, "");
    if (!t) return null;
    let x = t;
    if (x.includes(",") && x.includes(".")) x = x.replace(/\./g, "").replace(",", ".");
    else if (x.includes(",")) x = x.replace(",", ".");
    const n = Number(x);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/**
 * Interpreta el JSON de /stats (forma no documentada públicamente): acepta array
 * o objeto con arrays en propiedades comunes.
 */
export function parseStatsICL(json: unknown): PuntoICLArquiler[] {
  const out: PuntoICLArquiler[] = [];
  const seen = new Set<string>();

  function pushPoint(fechaRaw: unknown, valorRaw: unknown) {
    if (fechaRaw == null) return;
    const fecha = normalizarFecha(String(fechaRaw));
    if (!fecha) return;
    const valor = extraerNumero(valorRaw);
    if (valor == null || valor <= 0) return;
    if (seen.has(fecha)) return;
    seen.add(fecha);
    out.push({ fecha, valor });
  }

  function consumeArray(arr: unknown[]) {
    for (const item of arr) {
      if (item == null || typeof item !== "object") continue;
      const o = item as Record<string, unknown>;
      const fecha =
        o.fecha ?? o.date ?? o.Fecha ?? o.fecha_indice ?? o.fechaIndice ?? o.d ?? o.day;
      const valor =
        o.valor ??
        o.value ??
        o.icl ??
        o.indice ??
        o.nivel ??
        o.ICL ??
        o.level;
      pushPoint(fecha, valor);
    }
  }

  if (Array.isArray(json)) {
    consumeArray(json);
  } else if (json && typeof json === "object") {
    const o = json as Record<string, unknown>;
    const candidates = [o.data, o.stats, o.result, o.results, o.series, o.items, o.values];
    for (const c of candidates) {
      if (Array.isArray(c)) consumeArray(c);
    }
    if (out.length === 0 && Array.isArray(o.rows)) consumeArray(o.rows);
  }

  out.sort((a, b) => a.fecha.localeCompare(b.fecha));
  return out;
}

export async function fetchArquilerStats(): Promise<PuntoICLArquiler[]> {
  const key = getApiKey();
  if (!key) {
    throw new Error("Falta la variable de entorno RAPIDAPI_ARQUILER_KEY.");
  }

  const res = await fetch(STATS_URL, {
    method: "GET",
    headers: {
      "x-rapidapi-key": key,
      "x-rapidapi-host": RAPIDAPI_HOST,
    },
    next: { revalidate: 0 },
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Arquiler API HTTP ${res.status}: ${text.slice(0, 200)}`);
  }

  let json: unknown;
  try {
    json = JSON.parse(text) as unknown;
  } catch {
    throw new Error("Arquiler API: respuesta no es JSON válido.");
  }

  const puntos = parseStatsICL(json);
  if (puntos.length === 0) {
    throw new Error(
      "Arquiler API: no se pudieron leer puntos ICL del JSON. Revisá el formato de /stats.",
    );
  }

  return puntos;
}

export function isArquilerApiConfigured(): boolean {
  return Boolean(getApiKey());
}
