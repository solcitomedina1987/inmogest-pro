const UNIDADES = [
  "cero",
  "uno",
  "dos",
  "tres",
  "cuatro",
  "cinco",
  "seis",
  "siete",
  "ocho",
  "nueve",
  "diez",
  "once",
  "doce",
  "trece",
  "catorce",
  "quince",
  "dieciséis",
  "diecisiete",
  "dieciocho",
  "diecinueve",
  "veinte",
] as const;

const DECENAS = [
  "",
  "",
  "veinte",
  "treinta",
  "cuarenta",
  "cincuenta",
  "sesenta",
  "setenta",
  "ochenta",
  "noventa",
] as const;

function bajo100(n: number): string {
  if (n < 21) return UNIDADES[n];
  const d = Math.floor(n / 10);
  const u = n % 10;
  if (d === 2) return u === 0 ? "veinte" : `veinti${UNIDADES[u]}`;
  const dec = DECENAS[d];
  if (u === 0) return dec;
  return `${dec} y ${UNIDADES[u]}`;
}

function bajo1000(n: number): string {
  if (n < 100) return bajo100(n);
  const c = Math.floor(n / 100);
  const resto = n % 100;
  const cientos =
    c === 1
      ? resto === 0
        ? "cien"
        : "ciento"
      : c === 2
        ? "doscientos"
        : c === 3
          ? "trescientos"
          : c === 4
            ? "cuatrocientos"
            : c === 5
              ? "quinientos"
              : c === 6
                ? "seiscientos"
                : c === 7
                  ? "setecientos"
                  : c === 8
                    ? "ochocientos"
                    : "novecientos";
  if (resto === 0) return cientos;
  return `${cientos} ${bajo100(resto)}`.trim();
}

/** Millares 1–999: "dos mil", "veintiún mil", "doscientos mil". */
function prefijoMiles(m: number): string {
  if (m === 1) return "mil";
  if (m < 100) return `${bajo100(m)} mil`;
  return `${bajo1000(m)} mil`;
}

function miles(n: number): string {
  if (n < 1000) return bajo1000(n);
  const m = Math.floor(n / 1000);
  const r = n % 1000;
  const pref = prefijoMiles(m);
  if (r === 0) return pref;
  return `${pref} ${bajo1000(r)}`.trim();
}

function millones(n: number): string {
  if (n < 1_000_000) return miles(n);
  const mi = Math.floor(n / 1_000_000);
  const r = n % 1_000_000;
  const pref =
    mi === 1 ? "un millón" : mi < 100 ? `${bajo100(mi)} millones` : `${bajo1000(mi)} millones`;
  if (r === 0) return pref;
  return `${pref} ${miles(r)}`.trim();
}

/**
 * Monto en pesos argentinos a texto (parte entera + centavos si aplica).
 * Uso en recibo; no reemplaza asesoría contable.
 */
export function montoPesosArgentinosALetras(valor: number): string {
  if (!Number.isFinite(valor) || valor < 0) return "cero";
  const ent = Math.floor(valor);
  const cents = Math.round((valor - ent) * 100);
  const entTxt = millones(ent);
  const capitalizado = entTxt.charAt(0).toUpperCase() + entTxt.slice(1);
  if (cents <= 0) return `${capitalizado} pesos`;
  return `${capitalizado} pesos con ${cents}/100`;
}
