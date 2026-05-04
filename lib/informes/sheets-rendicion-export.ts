/**
 * Exporta un informe de rendición (payload v4) a Google Sheets.
 *
 * Requiere compartir el spreadsheet con el email de la service account
 * (el mismo que GOOGLE_CLIENT_EMAIL usado para Calendar).
 *
 * Variables:
 *   GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY (ya usadas en Calendar)
 *   GOOGLE_RENDICION_SPREADSHEET_ID (opcional; si falta, usa el ID por defecto del proyecto)
 */

import { google } from "googleapis";
import { conceptoRendicionKeyDesdeLinea } from "@/lib/cobranzas/concepto-rendicion-key";
import { impactoLineaEffective } from "@/lib/informes/rendicion-v4-display";
import type { InformeRendicionPayloadV4, UnidadRendicionV4 } from "@/lib/informes/rendicion-types";

const SPREADSHEET_ID_DEFAULT = "1yhVI_z6L2e5jIQAVynyKaG-sC-LCk3fVFTUEyciy4js";

const FIXED_HEADERS = ["Propiedad", "Propietario", "Inquilino", "Alquiler", "Comisión mensual"] as const;

const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";

function normalizePrivateKey(raw: string): string {
  return raw.replace(/\\\\n/g, "\n").replace(/\\n/g, "\n");
}

function getSpreadsheetId(): string {
  return process.env.GOOGLE_RENDICION_SPREADSHEET_ID?.trim() || SPREADSHEET_ID_DEFAULT;
}

function getSheetsClient() {
  const email = process.env.GOOGLE_CLIENT_EMAIL;
  const rawKey = process.env.GOOGLE_PRIVATE_KEY;
  if (!email || !rawKey) {
    throw new Error(
      "Google no está configurado. Definí GOOGLE_CLIENT_EMAIL y GOOGLE_PRIVATE_KEY (misma service account que Calendar).",
    );
  }
  const privateKey = normalizePrivateKey(rawKey);
  const auth = new google.auth.GoogleAuth({
    credentials: { client_email: email, private_key: privateKey },
    scopes: [SHEETS_SCOPE],
  });
  return google.sheets({ version: "v4", auth });
}

export function googleSheetsRendicionExportConfigurado(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY);
}

function normKey(s: string): string {
  return s.trim().toLowerCase();
}

/** Índice 1-based de columna → letra A, B, …, Z, AA… */
function colIndexToA1Letter(index1Based: number): string {
  let n = index1Based;
  let s = "";
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function quoteSheet(title: string): string {
  return `'${title.replace(/'/g, "''")}'`;
}

function orderedUniqueConceptsFromUnidades(unidades: UnidadRendicionV4[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const u of unidades) {
    for (const line of u.lineas) {
      if (impactoLineaEffective(line) === "alquiler" || conceptoRendicionKeyDesdeLinea(line) === "alquiler") {
        continue;
      }
      const label = (line.concepto ?? "").trim() || "Otro";
      const k = normKey(label);
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(label);
    }
  }
  return out;
}

function mergeHeaderRow(existingFirstRow: string[], conceptsFromExport: string[]): string[] {
  const trimmed = existingFirstRow.map((c) => (c == null ? "" : String(c)).trim());
  const nonEmpty = trimmed.filter((c) => c.length > 0);
  const extrasFromSheet = nonEmpty.length > 5 ? nonEmpty.slice(5) : [];
  const seen = new Set<string>(extrasFromSheet.map(normKey));
  const mergedExtras = [...extrasFromSheet];
  for (const c of conceptsFromExport) {
    const k = normKey(c);
    if (!seen.has(k)) {
      seen.add(k);
      mergedExtras.push(c);
    }
  }
  return [...FIXED_HEADERS, ...mergedExtras];
}

function headerIndexMap(headers: string[]): Map<string, number> {
  const m = new Map<string, number>();
  headers.forEach((h, i) => m.set(normKey(h), i));
  return m;
}

function buildRowNumbers(
  headers: string[],
  u: UnidadRendicionV4,
  payload: InformeRendicionPayloadV4,
): (string | number | null)[] {
  const idx = headerIndexMap(headers);
  const row: (string | number | null)[] = headers.map(() => null);

  const setAt = (headerLabel: string, value: string | number | null) => {
    const i = idx.get(normKey(headerLabel));
    if (i !== undefined) row[i] = value;
  };

  setAt("Propiedad", u.direccion_display);
  setAt("Propietario", payload.propietario_nombre);
  setAt("Inquilino", u.inquilino_nombre);
  setAt("Alquiler", u.monto_alquiler);
  setAt("Comisión mensual", -Math.abs(u.comision_inmobiliaria_unidad));

  for (const line of u.lineas) {
    if (impactoLineaEffective(line) === "alquiler" || conceptoRendicionKeyDesdeLinea(line) === "alquiler") {
      continue;
    }
    const label = (line.concepto ?? "").trim() || "Otro";
    const col = idx.get(normKey(label));
    if (col === undefined) continue;
    const imp = impactoLineaEffective(line);
    const m = Number(line.monto) || 0;
    const signed = imp === "propietario_resta" ? -Math.abs(m) : Math.abs(m);
    const prev = row[col];
    row[col] = typeof prev === "number" ? prev + signed : signed;
  }

  return row;
}

async function getOrCreateSheetId(sheets: ReturnType<typeof getSheetsClient>, spreadsheetId: string, title: string) {
  const meta = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets.properties(sheetId,title)",
  });
  const exists = meta.data.sheets?.some((s) => s.properties?.title === title);
  if (exists) return;

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [{ addSheet: { properties: { title } } }],
    },
  });
}

async function readHeaderRow(
  sheets: ReturnType<typeof getSheetsClient>,
  spreadsheetId: string,
  sheetTitle: string,
): Promise<string[]> {
  const range = `${quoteSheet(sheetTitle)}!1:1`;
  const res = await sheets.spreadsheets.values.get({ spreadsheetId, range });
  const row = res.data.values?.[0] ?? [];
  return row.map((c) => (c == null ? "" : String(c)).trim());
}

async function readColumnA(
  sheets: ReturnType<typeof getSheetsClient>,
  spreadsheetId: string,
  sheetTitle: string,
): Promise<string[]> {
  const range = `${quoteSheet(sheetTitle)}!A:A`;
  const res = await sheets.spreadsheets.values.get({ spreadsheetId, range, majorDimension: "COLUMNS" });
  const col = res.data.values?.[0] ?? [];
  return col.map((c) => (c == null ? "" : String(c)).trim());
}

/** Última fila (1-based) con texto no vacío en columna A. */
function lastNonEmptyRowInA(colA: string[]): number {
  let last = 0;
  for (let i = 0; i < colA.length; i++) {
    if (colA[i] !== "") last = i + 1;
  }
  return last;
}

async function readRowsAC(
  sheets: ReturnType<typeof getSheetsClient>,
  spreadsheetId: string,
  sheetTitle: string,
  rowStart: number,
  rowEnd: number,
): Promise<{ a: string; c: string }[]> {
  if (rowEnd < rowStart) return [];
  const range = `${quoteSheet(sheetTitle)}!A${rowStart}:C${rowEnd}`;
  const res = await sheets.spreadsheets.values.get({ spreadsheetId, range });
  const rows = res.data.values ?? [];
  return rows.map((r) => ({
    a: r[0] == null ? "" : String(r[0]).trim(),
    c: r[2] == null ? "" : String(r[2]).trim(),
  }));
}

export type SheetsRendicionExportResult =
  | { ok: true; sheetTitle: string }
  | { ok: false; error: string };

export async function exportInformeRendicionV4ToGoogleSheets(
  payload: InformeRendicionPayloadV4,
): Promise<SheetsRendicionExportResult> {
  const sheetTitle = payload.mes_periodo;
  if (!/^\d{4}-\d{2}$/.test(sheetTitle)) {
    return { ok: false, error: "El período del informe no tiene formato YYYY-MM." };
  }

  try {
    const sheets = getSheetsClient();
    const spreadsheetId = getSpreadsheetId();

    await getOrCreateSheetId(sheets, spreadsheetId, sheetTitle);

    const conceptsFromExport = orderedUniqueConceptsFromUnidades(payload.unidades);
    let headerCells = await readHeaderRow(sheets, spreadsheetId, sheetTitle);
    const onlyEmpty = headerCells.every((h) => h === "");
    if (onlyEmpty) {
      headerCells = [...FIXED_HEADERS, ...conceptsFromExport];
    } else {
      headerCells = mergeHeaderRow(headerCells, conceptsFromExport);
    }

    const endLetter = colIndexToA1Letter(headerCells.length);
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${quoteSheet(sheetTitle)}!A1:${endLetter}1`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [headerCells] },
    });

    for (const u of payload.unidades) {
      const colA = await readColumnA(sheets, spreadsheetId, sheetTitle);
      const lastOccupied = lastNonEmptyRowInA(colA);
      const scanEnd = Math.max(lastOccupied, 2);
      const block = await readRowsAC(sheets, spreadsheetId, sheetTitle, 2, scanEnd);

      let matchRow: number | null = null;
      for (let i = 0; i < block.length; i++) {
        if (normKey(block[i].a) === normKey(u.direccion_display) && normKey(block[i].c) === normKey(u.inquilino_nombre)) {
          matchRow = 2 + i;
          break;
        }
      }

      const rowValues = buildRowNumbers(headerCells, u, payload);
      const endL = colIndexToA1Letter(headerCells.length);
      const targetRow = matchRow ?? lastOccupied + 1;

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${quoteSheet(sheetTitle)}!A${targetRow}:${endL}${targetRow}`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [rowValues] },
      });
    }

    return { ok: true, sheetTitle };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    const details =
      typeof e === "object" && e !== null && "errors" in e ? JSON.stringify((e as { errors?: unknown }).errors) : "";
    return {
      ok: false,
      error: `${msg}${details ? ` ${details}` : ""}`.slice(0, 500),
    };
  }
}
