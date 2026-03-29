"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  MAX_IMAGENES_PROPIEDAD,
  PROPIEDAD_IMAGEN_PLACEHOLDER,
} from "@/lib/constants/propiedades";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { storagePathFromPublicUrl } from "@/lib/supabase/storage-path";
import { parsePropiedadFormData, toPropiedadDbPayload } from "@/lib/validations/propiedad";

const BUCKET = "propiedades";

function collectImages(formData: FormData): File[] {
  return formData
    .getAll("images")
    .filter((x): x is File => x instanceof File && x.size > 0)
    .slice(0, MAX_IMAGENES_PROPIEDAD);
}

async function insertImagenes(supabase: SupabaseClient, propiedadId: string, files: File[]) {
  if (files.length === 0) {
    await supabase.from("propiedades_img").insert({
      propiedad_id: propiedadId,
      url_imagen: PROPIEDAD_IMAGEN_PLACEHOLDER,
      orden: 0,
    });
    return;
  }

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const ext = file.name.split(".").pop()?.replace(/[^a-zA-Z0-9]/g, "") || "jpg";
    const path = `${propiedadId}/${randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });
    if (upErr) {
      throw new Error(upErr.message);
    }
    const {
      data: { publicUrl },
    } = supabase.storage.from(BUCKET).getPublicUrl(path);
    await supabase.from("propiedades_img").insert({
      propiedad_id: propiedadId,
      url_imagen: publicUrl,
      orden: i,
    });
  }
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
  const files = collectImages(formData);

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
    await insertImagenes(supabase, created.id as string, files);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error al subir imágenes." };
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
  const files = collectImages(formData);

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

  if (files.length > 0) {
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
      await insertImagenes(supabase, id, files);
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Error al subir imágenes." };
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
