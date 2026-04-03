"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  MAX_IMAGENES_PROPIEDAD,
  PROPIEDAD_IMAGEN_PLACEHOLDER,
} from "@/lib/constants/propiedades";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { storagePathFromPublicUrl } from "@/lib/supabase/storage-path";
import { parsePropiedadFormData, toPropiedadDbPayload } from "@/lib/validations/propiedad";

const BUCKET = "propiedades";

/**
 * Las imágenes se suben directamente a Supabase Storage desde el navegador
 * (evita el límite de 4.5 MB de Vercel en serverless functions).
 * El Server Action solo recibe las URLs resultantes como strings en el FormData.
 */
function collectImageUrls(formData: FormData): string[] {
  return formData
    .getAll("imageUrls")
    .filter((x): x is string => typeof x === "string" && x.startsWith("https://"))
    .slice(0, MAX_IMAGENES_PROPIEDAD);
}

async function insertImagenesFromUrls(
  supabase: SupabaseClient,
  propiedadId: string,
  urls: string[],
) {
  if (urls.length === 0) {
    const { error } = await supabase.from("propiedades_img").insert({
      propiedad_id: propiedadId,
      url_imagen: PROPIEDAD_IMAGEN_PLACEHOLDER,
      orden: 0,
    });
    if (error) throw new Error(error.message);
    return;
  }

  const rows = urls.map((url_imagen, orden) => ({
    propiedad_id: propiedadId,
    url_imagen,
    orden,
  }));

  const { error } = await supabase.from("propiedades_img").insert(rows);
  if (error) throw new Error(error.message);
}

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function createProperty(formData: FormData): Promise<ActionResult> {
  const gate = await requireAdmin();
  if (!gate.ok) {
    return {
      ok: false,
      error: gate.code === "no-auth" ? "Iniciá sesión para continuar." : "No tenés permisos para esta acción.",
    };
  }
  const { supabase } = gate;

  const parsed = parsePropiedadFormData(formData);
  if (!parsed.success) {
    const first = parsed.error.flatten().fieldErrors;
    const msg = Object.values(first).flat()[0] ?? "Datos inválidos";
    return { ok: false, error: msg };
  }

  const row = toPropiedadDbPayload(parsed.data);
  const imageUrls = collectImageUrls(formData);

  const { data: created, error: insErr } = await supabase
    .from("propiedades")
    .insert({
      ...row,
      is_active: true,
      descripcion: null,
    })
    .select("id")
    .single();

  if (insErr || !created) {
    return { ok: false, error: insErr?.message ?? "No se pudo crear la propiedad." };
  }

  try {
    await insertImagenesFromUrls(supabase, created.id as string, imageUrls);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error al guardar imágenes." };
  }

  revalidatePath("/dashboard/propiedades");
  revalidatePath("/");
  return { ok: true };
}

export async function updateProperty(formData: FormData): Promise<ActionResult> {
  const gate = await requireAdmin();
  if (!gate.ok) {
    return {
      ok: false,
      error: gate.code === "no-auth" ? "Iniciá sesión para continuar." : "No tenés permisos para esta acción.",
    };
  }
  const { supabase } = gate;

  const id = formData.get("id") as string | null;
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return { ok: false, error: "Propiedad inválida." };
  }

  const parsed = parsePropiedadFormData(formData);
  if (!parsed.success) {
    const first = parsed.error.flatten().fieldErrors;
    const msg = Object.values(first).flat()[0] ?? "Datos inválidos";
    return { ok: false, error: msg };
  }

  const row = toPropiedadDbPayload(parsed.data);
  const imageUrls = collectImageUrls(formData);

  const { error: upErr } = await supabase
    .from("propiedades")
    .update({
      ...row,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("is_active", true);

  if (upErr) {
    return { ok: false, error: upErr.message };
  }

  if (imageUrls.length > 0) {
    const { data: imgs } = await supabase.from("propiedades_img").select("url_imagen").eq("propiedad_id", id);

    const paths =
      imgs
        ?.map((r) => storagePathFromPublicUrl((r as { url_imagen: string }).url_imagen, BUCKET))
        .filter((p): p is string => Boolean(p)) ?? [];

    if (paths.length > 0) {
      await supabase.storage.from(BUCKET).remove(paths);
    }

    await supabase.from("propiedades_img").delete().eq("propiedad_id", id);

    try {
      await insertImagenesFromUrls(supabase, id, imageUrls);
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Error al guardar imágenes." };
    }
  }

  revalidatePath("/dashboard/propiedades");
  revalidatePath("/");
  return { ok: true };
}

export async function deleteProperty(id: string): Promise<ActionResult> {
  const gate = await requireAdmin();
  if (!gate.ok) {
    return {
      ok: false,
      error: gate.code === "no-auth" ? "Iniciá sesión para continuar." : "No tenés permisos para esta acción.",
    };
  }
  const { supabase } = gate;

  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return { ok: false, error: "Propiedad inválida." };
  }

  const { error } = await supabase
    .from("propiedades")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/dashboard/propiedades");
  revalidatePath("/");
  return { ok: true };
}
