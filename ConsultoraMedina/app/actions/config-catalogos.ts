"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { esImpactoCatalogoDb, type ImpactoCatalogoDb } from "@/lib/config-global/impacto-catalogo";

export type ConceptoPagoCatalogoRow = {
  id: number;
  nombre: string;
  impacto: ImpactoCatalogoDb;
  icono: string;
  slug: string | null;
  deleted_at: string | null;
};

export type TipoPropiedadRow = { id: number; nombre: string; deleted_at: string | null };
export type EstadoPropiedadRow = { id: number; nombre: string; deleted_at: string | null };

export type CatalogoActionResult<T = void> = { ok: true; data?: T } | { ok: false; error: string };

function revalidateAdminGeneral() {
  revalidatePath("/dashboard/admin-general");
  revalidatePath("/dashboard/propiedades");
  revalidatePath("/dashboard/cobranzas");
}

// ─── Conceptos de pago ─────────────────────────────────────────────────────

export async function listConceptosPagoAdmin(): Promise<CatalogoActionResult<ConceptoPagoCatalogoRow[]>> {
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false, error: gate.code === "no-auth" ? "Iniciá sesión." : "Sin permisos." };
  const { data, error } = await gate.supabase
    .from("conceptos_pago")
    .select("id, nombre, impacto, icono, slug, deleted_at")
    .order("nombre", { ascending: true });
  if (error) return { ok: false, error: error.message };
  const rows = (data ?? []) as ConceptoPagoCatalogoRow[];
  return { ok: true, data: rows };
}

/** Solo activos — registro/edición de pagos y vista previa de totales. */
export async function listConceptosPagoActivos(): Promise<CatalogoActionResult<ConceptoPagoCatalogoRow[]>> {
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false, error: gate.code === "no-auth" ? "Iniciá sesión." : "Sin permisos." };
  const { data, error } = await gate.supabase
    .from("conceptos_pago")
    .select("id, nombre, impacto, icono, slug, deleted_at")
    .is("deleted_at", null)
    .order("nombre", { ascending: true });
  if (error) return { ok: false, error: error.message };
  const rows = (data ?? []) as ConceptoPagoCatalogoRow[];
  return { ok: true, data: rows };
}

export async function createConceptoPago(input: {
  nombre: string;
  impacto: string;
  icono?: string;
  slug?: string | null;
}): Promise<CatalogoActionResult<{ id: number }>> {
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false, error: gate.code === "no-auth" ? "Iniciá sesión." : "Sin permisos." };
  const nombre = input.nombre?.trim();
  if (!nombre) return { ok: false, error: "El nombre es obligatorio." };
  if (!esImpactoCatalogoDb(input.impacto)) return { ok: false, error: "Impacto inválido." };
  const slug = input.slug?.trim() || null;
  const { data, error } = await gate.supabase
    .from("conceptos_pago")
    .insert({
      nombre,
      impacto: input.impacto,
      icono: input.icono?.trim() || "Circle",
      slug: slug || null,
      deleted_at: null,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };
  revalidateAdminGeneral();
  return { ok: true, data: { id: data!.id as number } };
}

export async function updateConceptoPago(input: {
  id: number;
  nombre: string;
  impacto: string;
  icono?: string;
  slug?: string | null;
}): Promise<CatalogoActionResult> {
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false, error: gate.code === "no-auth" ? "Iniciá sesión." : "Sin permisos." };
  const nombre = input.nombre?.trim();
  if (!nombre) return { ok: false, error: "El nombre es obligatorio." };
  if (!esImpactoCatalogoDb(input.impacto)) return { ok: false, error: "Impacto inválido." };
  const slug = input.slug?.trim() || null;
  const { error } = await gate.supabase
    .from("conceptos_pago")
    .update({
      nombre,
      impacto: input.impacto,
      icono: input.icono?.trim() || "Circle",
      slug: slug || null,
    })
    .eq("id", input.id);
  if (error) return { ok: false, error: error.message };
  revalidateAdminGeneral();
  return { ok: true };
}

export async function softDeleteConceptoPago(id: number): Promise<CatalogoActionResult> {
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false, error: gate.code === "no-auth" ? "Iniciá sesión." : "Sin permisos." };
  const { error } = await gate.supabase.from("conceptos_pago").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidateAdminGeneral();
  return { ok: true };
}

export async function restoreConceptoPago(id: number): Promise<CatalogoActionResult> {
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false, error: gate.code === "no-auth" ? "Iniciá sesión." : "Sin permisos." };
  const { error } = await gate.supabase.from("conceptos_pago").update({ deleted_at: null }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidateAdminGeneral();
  return { ok: true };
}

// ─── Tipos de propiedad ────────────────────────────────────────────────────

export async function listTiposPropiedadAdmin(): Promise<CatalogoActionResult<TipoPropiedadRow[]>> {
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false, error: gate.code === "no-auth" ? "Iniciá sesión." : "Sin permisos." };
  const { data, error } = await gate.supabase.from("tipos_propiedad").select("id, nombre, deleted_at").order("nombre");
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: (data ?? []) as TipoPropiedadRow[] };
}

export async function createTipoPropiedad(nombre: string): Promise<CatalogoActionResult<{ id: number }>> {
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false, error: gate.code === "no-auth" ? "Iniciá sesión." : "Sin permisos." };
  const n = nombre?.trim();
  if (!n) return { ok: false, error: "El nombre es obligatorio." };
  const { data, error } = await gate.supabase.from("tipos_propiedad").insert({ nombre: n, deleted_at: null }).select("id").single();
  if (error) return { ok: false, error: error.message };
  revalidateAdminGeneral();
  return { ok: true, data: { id: data!.id as number } };
}

export async function updateTipoPropiedad(id: number, nombre: string): Promise<CatalogoActionResult> {
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false, error: gate.code === "no-auth" ? "Iniciá sesión." : "Sin permisos." };
  const n = nombre?.trim();
  if (!n) return { ok: false, error: "El nombre es obligatorio." };
  const { error } = await gate.supabase.from("tipos_propiedad").update({ nombre: n }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidateAdminGeneral();
  return { ok: true };
}

export async function softDeleteTipoPropiedad(id: number): Promise<CatalogoActionResult> {
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false, error: gate.code === "no-auth" ? "Iniciá sesión." : "Sin permisos." };
  const { error } = await gate.supabase.from("tipos_propiedad").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidateAdminGeneral();
  return { ok: true };
}

export async function restoreTipoPropiedad(id: number): Promise<CatalogoActionResult> {
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false, error: gate.code === "no-auth" ? "Iniciá sesión." : "Sin permisos." };
  const { error } = await gate.supabase.from("tipos_propiedad").update({ deleted_at: null }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidateAdminGeneral();
  return { ok: true };
}

// ─── Estados de propiedad ──────────────────────────────────────────────────

export async function listEstadosPropiedadAdmin(): Promise<CatalogoActionResult<EstadoPropiedadRow[]>> {
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false, error: gate.code === "no-auth" ? "Iniciá sesión." : "Sin permisos." };
  const { data, error } = await gate.supabase.from("estados_propiedad").select("id, nombre, deleted_at").order("nombre");
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: (data ?? []) as EstadoPropiedadRow[] };
}

export async function createEstadoPropiedad(nombre: string): Promise<CatalogoActionResult<{ id: number }>> {
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false, error: gate.code === "no-auth" ? "Iniciá sesión." : "Sin permisos." };
  const n = nombre?.trim();
  if (!n) return { ok: false, error: "El nombre es obligatorio." };
  const { data, error } = await gate.supabase.from("estados_propiedad").insert({ nombre: n, deleted_at: null }).select("id").single();
  if (error) return { ok: false, error: error.message };
  revalidateAdminGeneral();
  return { ok: true, data: { id: data!.id as number } };
}

export async function updateEstadoPropiedad(id: number, nombre: string): Promise<CatalogoActionResult> {
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false, error: gate.code === "no-auth" ? "Iniciá sesión." : "Sin permisos." };
  const n = nombre?.trim();
  if (!n) return { ok: false, error: "El nombre es obligatorio." };
  const { error } = await gate.supabase.from("estados_propiedad").update({ nombre: n }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidateAdminGeneral();
  return { ok: true };
}

export async function softDeleteEstadoPropiedad(id: number): Promise<CatalogoActionResult> {
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false, error: gate.code === "no-auth" ? "Iniciá sesión." : "Sin permisos." };
  const { error } = await gate.supabase.from("estados_propiedad").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidateAdminGeneral();
  return { ok: true };
}

export async function restoreEstadoPropiedad(id: number): Promise<CatalogoActionResult> {
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false, error: gate.code === "no-auth" ? "Iniciá sesión." : "Sin permisos." };
  const { error } = await gate.supabase.from("estados_propiedad").update({ deleted_at: null }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidateAdminGeneral();
  return { ok: true };
}
