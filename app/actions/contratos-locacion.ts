"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { mesesPeriodoEntreFechasContrato } from "@/lib/cobranzas/meses-contrato";
import { ESTADO_PROPIEDAD_CARTEL_ALQUILER } from "@/lib/constants/propiedades";
import { buildContratoLocacionPdfData } from "@/lib/contratos/contract-pdf-data";
import { deriveContratoLocacionEstado } from "@/lib/contratos/derive-estado-contrato";
import { generateContractDocument } from "@/lib/contratos/generate-contract-document";
import { contratoLocacionFormSchema } from "@/lib/validations/contrato-locacion";

type ContratoLocacionActionResult =
  | { ok: true; id: string; pdfPublicUrl: string | null }
  | { ok: false; error: string };

const ESTADO_PROPIEDAD_CONTRATO_VIGENTE = "Alquilada";
const BUCKET = "contratos-pdf";

function indiceDesdeTipoAjuste(tipo: string): "ICL" | "IPC" {
  return tipo.toUpperCase().includes("IPC") ? "IPC" : "ICL";
}

function estadoInicialDb(fechaFin: string): "VIGENTE" | "VENCIDO" {
  const d = deriveContratoLocacionEstado({ fecha_fin_contrato: fechaFin, rescindido_at: null, estado: null });
  return d === "VENCIDO" ? "VENCIDO" : "VIGENTE";
}

export async function crearContratoLocacion(input: unknown): Promise<ContratoLocacionActionResult> {
  const gate = await requireAdmin();
  if (!gate.ok) {
    return { ok: false, error: gate.code === "no-auth" ? "Inici? sesi?n." : "Sin permisos." };
  }
  const { supabase } = gate;

  const parsed = contratoLocacionFormSchema.safeParse(input);
  if (!parsed.success) {
    const first = Object.values(parsed.error.flatten().fieldErrors).flat()[0] ?? "Datos inv?lidos";
    return { ok: false, error: first };
  }
  const v = parsed.data;
  const indice = indiceDesdeTipoAjuste(v.tipo_ajuste);

  const { data: propiedadRow, error: propErr } = await supabase
    .from("propiedades")
    .select("id, estado, propietario_id, direccion")
    .eq("id", v.propiedad_id)
    .maybeSingle();

  if (propErr || !propiedadRow) {
    return { ok: false, error: propErr?.message ?? "Propiedad no encontrada." };
  }
  if (propiedadRow.estado !== ESTADO_PROPIEDAD_CARTEL_ALQUILER) {
    return {
      ok: false,
      error: "La propiedad no est? disponible para un nuevo contrato (debe estar en cartel / sin alquiler activo).",
    };
  }
  if (propiedadRow.propietario_id !== v.propietario_id) {
    return { ok: false, error: "El propietario debe coincidir con el titular registrado en la propiedad." };
  }

  const { data: activo } = await supabase
    .from("contratos_cobranza")
    .select("id")
    .eq("propiedad_id", v.propiedad_id)
    .eq("is_active", true)
    .is("deleted_at", null)
    .maybeSingle();
  if (activo) {
    return { ok: false, error: "Ya existe un contrato de cobranzas activo para esta propiedad." };
  }

  const [{ data: inq }, { data: prop }] = await Promise.all([
    supabase.from("clientes").select("nombre_completo, dni").eq("id", v.cliente_id).maybeSingle(),
    supabase.from("clientes").select("nombre_completo, dni").eq("id", v.propietario_id).maybeSingle(),
  ]);

  if (!inq || !prop) {
    return { ok: false, error: "No se pudieron cargar los datos del inquilino o del propietario." };
  }

  const { data: cobRow, error: cobErr } = await supabase
    .from("contratos_cobranza")
    .insert({
      propiedad_id: v.propiedad_id,
      cliente_id: v.cliente_id,
      locador_id: v.propietario_id,
      fecha_inicio: v.fecha_inicio_contrato,
      fecha_vencimiento: v.fecha_fin_contrato,
      monto_mensual: v.valor_mensual,
      dia_limite_pago: v.dia_limite_pago,
      meses_actualizacion: v.meses_actualizacion,
      indice_actualizacion: indice,
      ultima_actualizacion: null,
      is_active: true,
    })
    .select("id")
    .single();

  if (cobErr || !cobRow) {
    return { ok: false, error: cobErr?.message ?? "No se pudo crear el v?nculo de cobranzas." };
  }
  const cobranzaId = cobRow.id as string;

  const meses = mesesPeriodoEntreFechasContrato(v.fecha_inicio_contrato, v.fecha_fin_contrato);
  if (meses.length > 0) {
    const pagosRows = meses.map((mes_periodo) => ({
      contrato_id: cobranzaId,
      propiedad_id: v.propiedad_id,
      mes_periodo,
      monto_esperado: v.valor_mensual,
      estado: "Pendiente" as const,
    }));
    const { error: pagoErr } = await supabase.from("pagos").insert(pagosRows);
    if (pagoErr) {
      return { ok: false, error: pagoErr.message };
    }
  }

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
      contratos_cobranza_id: cobranzaId,
      dia_limite_pago: v.dia_limite_pago,
      meses_actualizacion: v.meses_actualizacion,
      indice_actualizacion: indice,
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
    const buf = await generateContractDocument(pdfData);
    const path = `${legalId}/contrato.pdf`;
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, buf, {
      contentType: "application/pdf",
      upsert: true,
    });
    if (upErr) {
      return { ok: false, error: `Contrato guardado pero fall? el PDF: ${upErr.message}` };
    }
    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
    pdfPublicUrl = pub.publicUrl;
    await supabase.from("contratos").update({ pdf_storage_path: path }).eq("id", legalId);
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Error al generar el PDF del contrato.",
    };
  }

  const { error: propUpErr } = await supabase
    .from("propiedades")
    .update({ estado: ESTADO_PROPIEDAD_CONTRATO_VIGENTE, cliente_id: v.cliente_id })
    .eq("id", v.propiedad_id);

  if (propUpErr) {
    return { ok: false, error: propUpErr.message };
  }

  revalidatePath("/dashboard/contratos");
  revalidatePath("/dashboard/cobranzas");
  revalidatePath("/dashboard/propiedades");
  return { ok: true, id: legalId, pdfPublicUrl };
}

export async function actualizarContratoLocacion(
  id: string,
  input: unknown,
): Promise<ContratoLocacionActionResult> {
  const gate = await requireAdmin();
  if (!gate.ok) {
    return { ok: false, error: gate.code === "no-auth" ? "Inici? sesi?n." : "Sin permisos." };
  }
  const { supabase } = gate;

  const { data: existente, error: exErr } = await supabase
    .from("contratos")
    .select(
      "id, rescindido_at, propiedad_id, pdf_storage_path, contratos_cobranza_id, propietario_id, cliente_id",
    )
    .eq("id", id)
    .maybeSingle();

  if (exErr || !existente) {
    return { ok: false, error: "Contrato no encontrado." };
  }
  if (existente.rescindido_at) {
    return { ok: false, error: "No se puede editar un contrato rescindido." };
  }

  const parsed = contratoLocacionFormSchema.safeParse(input);
  if (!parsed.success) {
    const first = Object.values(parsed.error.flatten().fieldErrors).flat()[0] ?? "Datos inv?lidos";
    return { ok: false, error: first };
  }
  const v = parsed.data;
  const indice = indiceDesdeTipoAjuste(v.tipo_ajuste);

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

  const estadoDb = estadoInicialDb(v.fecha_fin_contrato);

  const { error: upLeg } = await supabase
    .from("contratos")
    .update({
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
      dia_limite_pago: v.dia_limite_pago,
      meses_actualizacion: v.meses_actualizacion,
      indice_actualizacion: indice,
    })
    .eq("id", id);

  if (upLeg) {
    return { ok: false, error: upLeg.message };
  }

  const cobId = existente.contratos_cobranza_id as string | null;
  if (cobId) {
    const { error: upCob } = await supabase
      .from("contratos_cobranza")
      .update({
        propiedad_id: v.propiedad_id,
        cliente_id: v.cliente_id,
        locador_id: v.propietario_id,
        fecha_inicio: v.fecha_inicio_contrato,
        fecha_vencimiento: v.fecha_fin_contrato,
        monto_mensual: v.valor_mensual,
        dia_limite_pago: v.dia_limite_pago,
        meses_actualizacion: v.meses_actualizacion,
        indice_actualizacion: indice,
      })
      .eq("id", cobId);
    if (upCob) {
      return { ok: false, error: upCob.message };
    }
  }

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
    const buf = await generateContractDocument(pdfData);
    const path = (existente.pdf_storage_path as string) || `${id}/contrato.pdf`;
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, buf, {
      contentType: "application/pdf",
      upsert: true,
    });
    if (upErr) {
      return { ok: false, error: `Datos actualizados pero fall? el PDF: ${upErr.message}` };
    }
    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
    pdfPublicUrl = pub.publicUrl;
    await supabase.from("contratos").update({ pdf_storage_path: path }).eq("id", id);
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Error al regenerar el PDF.",
    };
  }

  revalidatePath("/dashboard/contratos");
  revalidatePath("/dashboard/cobranzas");
  revalidatePath("/dashboard/propiedades");
  return { ok: true, id, pdfPublicUrl };
}

export async function rescindirContratoLocacion(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const gate = await requireAdmin();
  if (!gate.ok) {
    return { ok: false, error: gate.code === "no-auth" ? "Inici? sesi?n." : "Sin permisos." };
  }
  const { supabase } = gate;

  const { data: row, error } = await supabase
    .from("contratos")
    .select("id, rescindido_at, contratos_cobranza_id, propiedad_id")
    .eq("id", id)
    .maybeSingle();

  if (error || !row) {
    return { ok: false, error: "Contrato no encontrado." };
  }
  if (row.rescindido_at) {
    return { ok: false, error: "El contrato ya est? rescindido." };
  }

  const now = new Date().toISOString();
  const { error: upL } = await supabase
    .from("contratos")
    .update({ rescindido_at: now, estado: "RESCINDIDO" })
    .eq("id", id);
  if (upL) {
    return { ok: false, error: upL.message };
  }

  const cobId = row.contratos_cobranza_id as string | null;
  if (cobId) {
    await supabase
      .from("contratos_cobranza")
      .update({ is_active: false, deleted_at: now })
      .eq("id", cobId);
  }

  const pid = row.propiedad_id as string;
  await supabase
    .from("propiedades")
    .update({ estado: ESTADO_PROPIEDAD_CARTEL_ALQUILER, cliente_id: null })
    .eq("id", pid);

  revalidatePath("/dashboard/contratos");
  revalidatePath("/dashboard/cobranzas");
  revalidatePath("/dashboard/propiedades");
  return { ok: true };
}
