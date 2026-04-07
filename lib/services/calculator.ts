const RAPIDAPI_HOST = "arquilerapi1.p.rapidapi.com";
const CALCULATE_URL = `https://${RAPIDAPI_HOST}/calculate`;

export type CalculatorRate = "ipc" | "icl";

export type CalculatorRequest = {
  amount: number;
  date: string; // YYYY-MM-DD
  months: number;
  rate: CalculatorRate;
};

export type CalculatorDataPoint = {
  date?: string;
  period?: string;
  value: number;
};

export type CalculatorResponse = {
  data: CalculatorDataPoint[];
};

function debugLog(message: string, payload?: unknown) {
  if (process.env.NODE_ENV !== "development") return;
  if (payload === undefined) {
    console.info(`[calculator] ${message}`);
    return;
  }
  console.info(`[calculator] ${message}`, payload);
}

function getApiKey(): string {
  const key = process.env.RAPIDAPI_ARQUILER_KEY?.trim();
  if (!key) throw new Error("Falta RAPIDAPI_ARQUILER_KEY.");
  return key;
}

function asNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v.replace(/\./g, "").replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function parseCalculatorResponse(json: unknown): CalculatorResponse {
  const root = (json ?? {}) as Record<string, unknown>;
  debugLog("raw response keys", Object.keys(root));
  const candidates = [root.data, root.result, root.results, root.items, root.values];
  const raw = candidates.find((c) => Array.isArray(c));
  if (!Array.isArray(raw)) {
    debugLog("no array payload found in response");
    throw new Error("Respuesta inválida de /calculate: falta array data.");
  }

  const data = raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const value = asNumber(row.value ?? row.amount ?? row.monto ?? row.result);
      if (value == null) return null;
      return {
        value,
        date:
          typeof row.date === "string"
            ? row.date.slice(0, 10)
            : typeof row.fecha === "string"
              ? row.fecha.slice(0, 10)
              : undefined,
        period:
          typeof row.period === "string"
            ? row.period.slice(0, 7)
            : typeof row.month === "string"
              ? row.month.slice(0, 7)
              : typeof row.mes === "string"
                ? row.mes.slice(0, 7)
                : undefined,
      };
    })
    .filter((x): x is NonNullable<typeof x> => Boolean(x));

  debugLog("parsed points", { count: data.length, sample: data.slice(0, 3) });
  return { data };
}

export async function calculateArquiler(payload: CalculatorRequest): Promise<CalculatorResponse> {
  const res = await fetch(CALCULATE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-rapidapi-key": getApiKey(),
      "x-rapidapi-host": RAPIDAPI_HOST,
    },
    body: JSON.stringify(payload),
    next: { revalidate: 0 },
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Arquiler /calculate HTTP ${res.status}: ${text.slice(0, 200)}`);
  }

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error("Arquiler /calculate devolvió JSON inválido.");
  }

  return parseCalculatorResponse(json);
}

export function pickEstimatedValue(
  response: CalculatorResponse,
  targetMonthYYYYMM: string,
): number | null {
  if (response.data.length === 0) {
    debugLog("pickEstimatedValue: empty data", { targetMonthYYYYMM });
    return null;
  }
  const byMonth = response.data.find((d) => d.period === targetMonthYYYYMM || d.date?.slice(0, 7) === targetMonthYYYYMM);
  if (byMonth) {
    debugLog("pickEstimatedValue: exact month match", { targetMonthYYYYMM, value: byMonth.value });
    return byMonth.value;
  }

  const sorted = [...response.data].sort((a, b) => (a.date ?? a.period ?? "").localeCompare(b.date ?? b.period ?? ""));
  const next = sorted.find((d) => (d.date ?? `${d.period}-01`) >= `${targetMonthYYYYMM}-01`);
  if (next) {
    debugLog("pickEstimatedValue: next available month", {
      targetMonthYYYYMM,
      picked: next.period ?? next.date,
      value: next.value,
    });
    return next.value;
  }

  const fallback = sorted[sorted.length - 1]?.value ?? null;
  debugLog("pickEstimatedValue: fallback last value", { targetMonthYYYYMM, fallback });
  return fallback;
}

export function isCalculatorConfigured(): boolean {
  return Boolean(process.env.RAPIDAPI_ARQUILER_KEY?.trim());
}
