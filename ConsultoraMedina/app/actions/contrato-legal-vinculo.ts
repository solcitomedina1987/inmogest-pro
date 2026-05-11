"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { buildContratoLocacionPdfData } from "@/lib/contratos/contract-pdf-data";
import { deriveContratoLocacionEstado } from "@/lib/contratos/derive-estado-contrato";
import { generateContractDocument } from "@/lib/contratos/generate-contract-document";
import { contratoLocacionFormSchema } from "@/lib/validations/contrato-locacion";

const BUCKET = "contratos-pdf";
const MAX_ARCHIVO_CONTRATO_BYTES = 15 * 1024 * 1024;

export type VinculoLegalResult =
  | { ok: true; id: string; pdfPublicUrl: string | null }
  | { ok: false; error: string };

type ArchivoMeta =
  | { kind: "pdf"; mime: string; ext: "pdf" }
  | { kind: "word"; mime: string; ext: "doc" | "docx" };

function metaArchivoContrato(file: File): ArchivoMeta | null {
  const n = file.name.toLowerCase();
  if (n.endsWith(".pdf")) return { kind: "pdf", mime: "application/pdf", ext: "pdf" };
  if (n.endsWith(".docx")) {
    return {
      kind: "word",
      mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ext: "docx",
    };
  }
  if (n.endsWith(".doc")) return { kind: "word", mime: "application/msword", ext: "doc" };
  return null;
}

function estadoInicialDb(fechaFin: string): "VIGENTE" | "VENCIDO" {
  const d = deriveContratoLocacionEstado({ fecha_fin_contrato: fechaFin, rescindido_at: null, estado: null });
  return d === "VENCIDO" ? "VENCIDO" : "VIGENTE";
}

function tipoAjusteDesdeIndice(indice: string): string {
  const u = indice.toUpperCase();
  if (u === "IPC") return "IPC";
  return "ICL";
}

/** Sube PDF/Word y registra fila en `contratos` vinculada a un `contratos_cobranza` existente (sin duplicar cobranzas). */
export async function vincularContratoLegalArchivoCobranza(formData: FormData): Promise<VinculoLegalResult> {
  const gate = await requireAdmin();
  if (!gate.ok) {
    return { ok: false, error: gate.code === "no-auth" ? "Iniciá sesión para continuar." : "Sin permisos." };
  }
  const { supabase } = gate;

  const cobranzaId = (formData.get("cobranza_id") as string | null)?.trim();
  if (!cobranzaId || !/^[0-9a-f-]{36}$/i.test(cobranzaId)) {
    return { ok: false, error: "Contrato de cobranzas inválido." };
  }

  const file = formData.get("archivo");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Seleccioná un archivo (.pdf, .doc o .docx)." };
  }
  if (file.size > MAX_ARCHIVO_CONTRATO_BYTES) {
    return { ok: false, error: "El archivo supera los 15 MB." };
  }

  const meta = metaArchivoContrato(file);
  if (!meta) {
    return { ok: false, error: "Formato no admitido. Usá .pdf, .doc o .docx." };
  }

  const { data: cob, error: cobErr } = await supabase
    .from("contratos_cobranza")
    .select(
      "id, propiedad_id, cliente_id, locador_id, fecha_inicio, fecha_vencimiento, monto_mensual, dia_limite_pago, meses_actualizacion, indice_actualizacion, deleted_at, is_active",
    )
    .eq("id", cobranzaId)
    .maybeSingle();

  if (cobErr || !cob) {
    return { ok: false, error: cobErr?.message ?? "No se encontró el contrato de cobranzas." };
  }
  if (cob.deleted_at) {
    return { ok: false, error: "Este contrato de cobranzas está eliminado." };
  }

  const { data: existente } = await supabase
    .from("contratos")
    .select("id")
    .eq("contratos_cobranza_id", cobranzaId)
    .maybeSingle();
  if (existente) {
    return { ok: false, error: "Ya existe un contrato legal vinculado a este alquiler." };
  }

  const tipoAjuste = tipoAjusteDesdeIndice(String(cob.indice_actualizacion ?? "ICL"));
  const estadoDb = estadoInicialDb(cob.fecha_vencimiento as string);

  const { data: legalRow, error: legErr } = await supabase
    .from("contratos")
    .insert({
      propiedad_id: cob.propiedad_id as string,
      propietario_id: cob.locador_id as string,
      cliente_id: cob.cliente_id as string,
      fecha_firma: cob.fecha_inicio as string,
      fecha_inicio_contrato: cob.fecha_inicio as string,
      fecha_fin_contrato: cob.fecha_vencimiento as string,
      valor_mensual: Number(cob.monto_mensual),
      valor_deposito: null,
      tipo_ajuste: tipoAjuste,
      caracteristicas_propiedad: "Ver documento adjunto o PDF cargado por la administración.",
      datos_garantes: "—",
      estado: estadoDb,
      rescindido_at: null,
      pdf_storage_path: null,
      adjunto_storage_path: null,
      adjunto_mime: null,
      contratos_cobranza_id: cobranzaId,
      dia_limite_pago: Number(cob.dia_limite_pago),
      meses_actualizacion: Number(cob.meses_actualizacion),
      indice_actualizacion: (cob.indice_actualizacion as "IPC" | "ICL") ?? "ICL",
    })
    .select("id")
    .single();

  if (legErr || !legalRow) {
    return { ok: false, error: legErr?.message ?? "No se pudo crear el registro legal." };
  }
  const legalId = legalRow.id as string;

  const buf = Buffer.from(await file.arrayBuffer());
  const relPath =
    meta.kind === "pdf" ? `${legalId}/contrato-cargado.pdf` : `${legalId}/contrato-cargado.${meta.ext}`;

  const { error: upErr } = await supabase.storage.from(BUCKET).upload(relPath, buf, {
    contentType: meta.mime,
    upsert: true,
  });
  if (upErr) {
    await supabase.from("contratos").delete().eq("id", legalId);
    return { ok: false, error: `Error al subir el archivo: ${upErr.message}` };
  }

  if (meta.kind === "pdf") {
    await supabase.from("contratos").update({ pdf_storage_path: relPath }).eq("id", legalId);
  } else {
    await supabase
      .from("contratos")
      .update({
        adjunto_storage_path: relPath,
        adjunto_mime: meta.mime,
      })
      .eq("id", legalId);
  }

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(relPath);
  const pdfPublicUrl = meta.kind === "pdf" ? pub.publicUrl : null;

  revalidatePath("/dashboard/contratos");
  revalidatePath("/dashboard/cobranzas");
  revalidatePath("/portal");
  revalidatePath("/propietarios/dashboard");
  return { ok: true, id: legalId, pdfPublicUrl };
}

/** Genera contrato legal + PDF y lo vincula a una cobranza existente (formulario plantilla). */
export async function vincularContratoLegalWebCobranza(
  cobranzaId: string,
  input: unknown,
): Promise<VinculoLegalResult> {
  const gate = await requireAdmin();
  if (!gate.ok) {
    return { ok: false, error: gate.code === "no-auth" ? "Iniciá sesión para continuar." : "Sin permisos." };
  }
  const { supabase } = gate;

  if (!cobranzaId || !/^[0-9a-f-]{36}$/i.test(cobranzaId)) {
    return { ok: false, error: "Contrato de cobranzas inválido." };
  }

  const { data: cob, error: cobErr } = await supabase
    .from("contratos_cobranza")
    .select(
      "id, propiedad_id, cliente_id, locador_id, fecha_inicio, fecha_vencimiento, monto_mensual, dia_limite_pago, meses_actualizacion, indice_actualizacion, deleted_at",
    )
    .eq("id", cobranzaId)
    .maybeSingle();

  if (cobErr || !cob) {
    return { ok: false, error: cobErr?.message ?? "No se encontró el contrato de cobranzas." };
  }
  if (cob.deleted_at) {
    return { ok: false, error: "Este contrato de cobranzas está eliminado." };
  }

  const { data: existente } = await supabase
    .from("contratos")
    .select("id")
    .eq("contratos_cobranza_id", cobranzaId)
    .maybeSingle();
  if (existente) {
    return { ok: false, error: "Ya existe un contrato legal vinculado a este alquiler." };
  }

  const parsed = contratoLocacionFormSchema.safeParse(input);
  if (!parsed.success) {
    const first = Object.values(parsed.error.flatten().fieldErrors).flat()[0] ?? "Datos inválidos";
    return { ok: false, error: first };
  }

  const v = {
    ...parsed.data,
    propiedad_id: cob.propiedad_id as string,
    cliente_id: cob.cliente_id as string,
    propietario_id: cob.locador_id as string,
  };

  if (v.propiedad_id !== cob.propiedad_id || v.cliente_id !== cob.cliente_id || v.propietario_id !== cob.locador_id) {
    return { ok: false, error: "Los datos no coinciden con el contrato de cobranzas." };
  }

  const { data: propiedadRow, error: propErr } = await supabase
    .from("propiedades")
    .select("direccion")
    .eq("id", v.propiedad_id)
    .maybeSingle();
  if (propErr || !propiedadRow) {
    return { ok: false, error: "Propiedad no encontrada." };
  }

  const [{ data: inq }, { data: prop }] = await Promise.all([
    supabase.from("clientes").select("nombre_completo, dni").eq("id", v.cliente_id).maybeSingle(),
    supabase.from("clientes").select("nombre_completo, dni").eq("id", v.propietario_id).maybeSingle(),
  ]);
  if (!inq || !prop) {
    return { ok: false, error: "No se pudieron cargar los datos del inquilino o del propietario." };
  }

  const indiceDb: "ICL" | "IPC" = v.tipo_ajuste.toUpperCase().includes("IPC") ? "IPC" : "ICL";

  const estadoDb = estadoInicialDb(v.fecha_fin_contrato);

  const { data: legalRow, error: legErr } = await supabase
    .from("contratos")
    .insert({
      propiedad_id: v.propiedad_id,
      propietario_id: v.propietario_id,
      cliente_id: v.cliente_id,
      fecha_firma: v.fecha_firma,
      fecha_inicio_contrato: v.fecha_inicio_contrato,
      fecha_fin_contrato: v.fecha_fin_contrato,
      valor_mensual: v.valor_mensual,
      valor_deposito: v.valor_deposito > 0 ? v.valor_deposito : null,
      tipo_ajuste: v.tipo_ajuste,
      caracteristicas_propiedad: v.caracteristicas_propiedad ?? "",
      datos_garantes: v.datos_garantes ?? "",
      estado: estadoDb,
      rescindido_at: null,
      pdf_storage_path: null,
      adjunto_storage_path: null,
      adjunto_mime: null,
      contratos_cobranza_id: cobranzaId,
      dia_limite_pago: v.dia_limite_pago,
      meses_actualizacion: v.meses_actualizacion,
      indice_actualizacion: indiceDb,
    })
    .select("id")
    .single();

  if (legErr || !legalRow) {
    return { ok: false, error: legErr?.message ?? "No se pudo registrar el contrato legal." };
  }
  const legalId = legalRow.id as string;

  const pdfData = buildContratoLocacionPdfData({
    fecha_firma: v.fecha_firma,
    fecha_inicio_contrato: v.fecha_inicio_contrato,
    fecha_fin_contrato: v.fecha_fin_contrato,
    valor_mensual: v.valor_mensual,
    valor_deposito: v.valor_deposito > 0 ? v.valor_deposito : null,
    tipo_ajuste: v.tipo_ajuste,
    caracteristicas_propiedad: v.caracteristicas_propiedad ?? "",
    datos_garantes: v.datos_garantes ?? "",
    inquilino_nombre: (inq.nombre_completo as string) ?? "",
    inquilino_dni: inq.dni as number,
    propietario_nombre: (prop.nombre_completo as string) ?? "",
    propietario_dni: prop.dni as number,
    propiedad_direccion: (propiedadRow.direccion as string) ?? "",
  });

  let pdfPublicUrl: string | null = null;
  try {
    const pdfBuf = await generateContractDocument(pdfData);
    const path = `${legalId}/contrato.pdf`;
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, pdfBuf, {
      contentType: "application/pdf",
      upsert: true,
    });
    if (upErr) {
      await supabase.from("contratos").delete().eq("id", legalId);
      return { ok: false, error: `Falló la subida del PDF: ${upErr.message}` };
    }
    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
    pdfPublicUrl = pub.publicUrl;
    await supabase.from("contratos").update({ pdf_storage_path: path }).eq("id", legalId);
  } catch (e) {
    await supabase.from("contratos").delete().eq("id", legalId);
    return { ok: false, error: e instanceof Error ? e.message : "Error al generar el PDF." };
  }

  const { error: upCob } = await supabase
    .from("contratos_cobranza")
    .update({
      fecha_inicio: v.fecha_inicio_contrato,
      fecha_vencimiento: v.fecha_fin_contrato,
      monto_mensual: v.valor_mensual,
      dia_limite_pago: v.dia_limite_pago,
      meses_actualizacion: v.meses_actualizacion,
      indice_actualizacion: indiceDb,
    })
    .eq("id", cobranzaId);

  if (upCob) {
    return { ok: false, error: upCob.message };
  }

  revalidatePath("/dashboard/contratos");
  revalidatePath("/dashboard/cobranzas");
  revalidatePath("/portal");
  revalidatePath("/propietarios/dashboard");
  return { ok: true, id: legalId, pdfPublicUrl };
}
