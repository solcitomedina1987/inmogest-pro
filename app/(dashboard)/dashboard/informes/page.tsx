import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { InformeRendicionListRow } from "@/lib/informes/rendicion-types";
import { InformesRendicionClient } from "@/components/informes/informes-rendicion-client";
import type { PropietarioOption } from "@/components/informes/nuevo-informe-dialog";

export const metadata: Metadata = {
  title: "Informes",
};

function unwrapFk<T>(v: T | T[] | null | undefined): T | null {
  if (v == null) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

export default async function InformesRendicionPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: perfil } = await supabase.from("perfiles").select("rol").eq("id", user.id).maybeSingle();
  if (perfil?.rol !== "admin") {
    redirect("/dashboard?restringido=1");
  }

  const [{ data: informesRaw, error: iErr }, { data: propsRaw, error: pErr }] = await Promise.all([
    supabase
      .from("informes_rendicion")
      .select(
        `
        id,
        propietario_cliente_id,
        mes_periodo,
        comision_porcentaje,
        monto_total,
        neto_rendir,
        fecha_generacion,
        propietario:clientes!informes_rendicion_propietario_cliente_id_fkey ( nombre_completo )
      `,
      )
      .order("fecha_generacion", { ascending: false }),
    supabase
      .from("clientes")
      .select("id, nombre_completo")
      .eq("is_active", true)
      .in("tipo_cliente", ["Propietario", "Ambos"])
      .order("nombre_completo"),
  ]);

  if (iErr) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 text-sm">
        <p className="font-medium">No se pudieron cargar los informes</p>
        <p className="text-muted-foreground mt-1">{iErr.message}</p>
        <p className="text-muted-foreground mt-2">
          Si la tabla no existe, aplicá la migración <code className="rounded bg-muted px-1">20260421120000_informes_rendicion.sql</code>.
        </p>
      </div>
    );
  }

  if (pErr) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 text-sm">
        <p className="font-medium">Error al cargar propietarios</p>
        <p className="text-muted-foreground mt-1">{pErr.message}</p>
      </div>
    );
  }

  const rows: InformeRendicionListRow[] = (informesRaw ?? []).map((raw) => {
    const r = raw as Record<string, unknown>;
    const prop = unwrapFk(r.propietario as { nombre_completo?: string } | null);
    return {
      id: r.id as string,
      propietario_cliente_id: r.propietario_cliente_id as string,
      propietario_nombre: prop?.nombre_completo?.trim() ? (prop.nombre_completo as string) : null,
      mes_periodo: r.mes_periodo as string,
      comision_porcentaje: Number(r.comision_porcentaje),
      monto_total: Number(r.monto_total),
      neto_rendir: Number(r.neto_rendir),
      fecha_generacion: r.fecha_generacion as string,
    };
  });

  const propietarios: PropietarioOption[] = (propsRaw ?? []).map((c) => ({
    id: c.id as string,
    label: ((c as { nombre_completo?: string }).nombre_completo ?? "").trim() || "—",
  }));

  return <InformesRendicionClient rows={rows} propietarios={propietarios} />;
}
