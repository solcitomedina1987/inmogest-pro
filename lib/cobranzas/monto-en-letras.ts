/**
 * Convierte un importe en pesos argentinos a texto en español (hasta billones).
 * Útil para recibos: “son pesos …”.
 */

const UNIDADES = [
  "",
  "uno",
  "dos",
  "tres",
  "cuatro",
  "cinco",
  "seis",
  "siete",
  "ocho",
  "nueve",
] as const;

const ESPECIAL_10_15: Record<number, string> = {
  10: "diez",
  11: "once",
  12: "doce",
  13: "trece",
  14: "catorce",
  15: "quince",
  16: "dieciséis",
  17: "diecisiete",
  18: "dieciocho",
  19: "diecinueve",
};

function veintiunoMasculino(n: number): string {
  if (n === 21) return "veintiún";
  if (n === 22) return "veintidós";
  if (n === 23) return "veintitrés";
  if (n === 26) return "veintiséis";
  return `veinti${UNIDADES[n % 10]}`;
}

/** Decenas 20-99 + unidad; `masculinoAntesPeso` ajusta “un/veintiún” delante de “pesos”. */
function decenasYUnidad(n: number, masculinoAntesPeso: boolean): string {
  const u = n % 10;
  const d = Math.floor(n / 10);
  if (d === 0) {
    if (u === 1 && masculinoAntesPeso) return "un";
    return UNIDADES[u];
  }
  if (d === 1) return ESPECIAL_10_15[n] ?? "";
  if (d === 2) {
    if (u === 0) return "veinte";
    if (masculinoAntesPeso && u === 1) return "veintiún";
    return veintiunoMasculino(n);
  }
  const nombreDecena =
    d === 3
      ? "treinta"
      : d === 4
        ? "cuarenta"
        : d === 5
          ? "cincuenta"
          : d === 6
            ? "sesenta"
            : d === 7
              ? "setenta"
              : d === 8
                ? "ochenta"
                : "noventa";
  if (u === 0) return nombreDecena;
  const uni =
    u === 1 && masculinoAntesPeso ? "un" : UNIDADES[u];
  return `${nombreDecena} y ${uni}`;
}

/** 1–999 (nunca 0). */
function tresCifras(n: number, masculinoAntesPeso: boolean): string {
  const c = Math.floor(n / 100);
  const resto = n % 100;
  const partes: string[] = [];
  if (c === 1 && resto === 0) partes.push("cien");
  else {
    if (c === 1) partes.push("ciento");
    else if (c === 2) partes.push("doscientos");
    else if (c === 3) partes.push("trescientos");
    else if (c === 4) partes.push("cuatrocientos");
    else if (c === 5) partes.push("quinientos");
    else if (c === 6) partes.push("seiscientos");
    else if (c === 7) partes.push("setecientos");
    else if (c === 8) partes.push("ochocientos");
    else if (c === 9) partes.push("novecientos");
    if (resto > 0) partes.push(decenasYUnidad(resto, masculinoAntesPeso));
  }
  return partes.join(" ");
}

/**
 * Parte entera > 0 a letras (sin “pesos”).
 * `masculinoAntesPeso` solo afecta el grupo inferior (unidades que van delante de “pesos”).
 */
function enteroEnLetrasCore(n: number, masculinoAntesPeso = true): string {
  if (n <= 0) return "cero";
  if (n < 100) return decenasYUnidad(n, masculinoAntesPeso);
  if (n < 1000) return tresCifras(n, masculinoAntesPeso);

  const millones = Math.floor(n / 1_000_000);
  const restoMillones = n % 1_000_000;
  const miles = Math.floor(restoMillones / 1000);
  const unidades = restoMillones % 1000;

  const partes: string[] = [];
  if (millones > 0) {
    partes.push(millones === 1 ? "un millón" : `${enteroEnLetrasCore(millones, false)} millones`);
  }
  if (miles > 0) {
    partes.push(miles === 1 ? "mil" : `${enteroEnLetrasCore(miles, false)} mil`);
  }
  if (unidades > 0) {
    const hayGrupoMayor = millones > 0 || miles > 0;
    const usarUno = hayGrupoMayor && unidades === 1;
    partes.push(
      usarUno ? "uno" : tresCifras(unidades, masculinoAntesPeso),
    );
  }
  return partes.join(" ");
}

/** Importe en pesos (y centavos si aplica) en letras minúsculas para párrafos formales. */
export function montoPesosEnLetras(valor: number): string {
  if (!Number.isFinite(valor)) return "—";
  const redondeado = Math.round(valor * 100) / 100;
  const ent = Math.floor(Math.abs(redondeado));
  const frac = Math.round((Math.abs(redondeado) - ent) * 100);
  const neg = redondeado < 0;

  let cuerpo: string;
  if (ent === 0) cuerpo = "cero pesos";
  else if (ent === 1) cuerpo = `un peso`;
  else cuerpo = `${enteroEnLetrasCore(ent)} pesos`;

  let centavosTxt = "";
  if (frac > 0) {
    const cWord =
      frac === 1
        ? "un centavo"
        : `${enteroEnLetrasCore(frac, true)} centavos`;
    centavosTxt = ` con ${cWord}`;
  }

  const out = `${cuerpo}${centavosTxt}`;
  return neg ? `menos ${out}` : out;
}
