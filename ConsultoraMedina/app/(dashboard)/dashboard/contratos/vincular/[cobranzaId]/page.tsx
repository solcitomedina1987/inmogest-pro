import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { VincularContratoLegalClient } from "@/components/contratos/vincular-contrato-legal-client";
import type { ContratoLocacionFormValues } from "@/lib/validations/contrato-locacion";

type PageProps = { params: Promise<{ cobranzaId: string }> };

function unwrapFk<T>(v: T | T[] | null | undefined): T | null {
  if (v == null) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

export default async function VincularContratoLegalPage({ params }: PageProps) {
  const { cobranzaId } = await params;
  if (!cobranzaId || !/^[0-9a-f-]{36}$/i.test(cobranzaId)) {
    notFound();
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }
  const { data: perfil } = await supabase.from("perfiles").select("rol").eq("id", user.id).maybeSingle();
  if (perfil?.rol !== "admin") {
    redirect("/dashboard?restringido=1");
  }

  const { data: raw, error } = await supabase
    .from("contratos_cobranza")
    .select(
      `
      id,
      propiedad_id,
      cliente_id,
      locador_id,
      fecha_inicio,
      fecha_vencimiento,
      monto_mensual,
      dia_limite_pago,
      meses_actualizacion,
      indice_actualizacion,
      deleted_at,
      propiedad:propiedades ( nombre, direccion ),
      contratos ( id )
    `,
    )
    .eq("id", cobranzaId)
    .maybeSingle();

  if (error || !raw) {
    notFound();
  }

  const r = raw as Record<string, unknown>;
  if (r.deleted_at) {
    notFound();
  }

  const leg = unwrapFk(r.contratos as { id: string } | { id: string }[] | null);
  if (leg?.id) {
    redirect(`/dashboard/contratos/${leg.id}`);
  }

  const prop = unwrapFk(r.propiedad as { nombre: string; direccion?: string | null } | null);
  const propiedadLabel = prop?.nombre?.trim()
    ? `${prop.nombre}${prop.direccion?.trim() ? ` · ${prop.direccion}` : ""}`
    : "Propiedad";

  const fi = r.fecha_inicio as string;
  const tipoAjuste =
    String(r.indice_actualizacion ?? "ICL").toUpperCase() === "IPC" ? "IPC" : "ICL";

  const defaults: ContratoLocacionFormValues = {
    propiedad_id: r.propiedad_id as string,
    propietario_id: r.locador_id as string,
    cliente_id: r.cliente_id as string,
    fecha_firma: fi,
    fecha_inicio_contrato: fi,
    fecha_fin_contrato: r.fecha_vencimiento as string,
    valor_mensual: Number(r.monto_mensual),
    valor_deposito: 0,
    tipo_ajuste: tipoAjuste,
    caracteristicas_propiedad: "",
    datos_garantes: "",
    dia_limite_pago: Number(r.dia_limite_pago),
    meses_actualizacion: Number(r.meses_actualizacion),
  };

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/cobranzas">← Volver a Alquileres</Link>
        </Button>
      </div>
      <VincularContratoLegalClient
        cobranzaId={cobranzaId}
        propiedadLabel={propiedadLabel}
        defaultsForm={defaults}
      />
    </div>
  );
}
