import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type { ContratoCobranzaRow, PagoRow } from "@/lib/cobranzas/types";
import { ensurePagosMensualesExistentes } from "@/lib/cobranzas/sync-pagos-mensuales";
import { buildContratoWidgetData } from "@/lib/portal/contrato-widget-data";
import { isCalculatorConfigured } from "@/lib/services/calculator";
import { PropietarioHeader } from "@/components/propietarios/propietario-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ContratoDetallesCard } from "@/components/portal/contrato-detalles-card";
import { ContratoPagosHistorial } from "@/components/portal/contrato-pagos-historial";
import { ContratoWidgets } from "@/components/portal/contrato-widgets";

export const dynamic = "force-dynamic";

function unwrapFk<T>(v: T | T[] | null | undefined): T | null {
  if (v == null) {
    return null;
  }
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

type PageProps = { params: Promise<{ id: string }> };

export default async function PropietarioPropiedadCobranzasPage({ params }: PageProps) {
  const { id: propiedadId } = await params;

  const auth = await createClient();
  const {
    data: { user },
  } = await auth.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const db = createServiceRoleClient();

  const { data: perfil, error: pe } = await db
    .from("perfiles")
    .select("cliente_id, nombre, is_active")
    .eq("id", user.id)
    .eq("rol", "propietario")
    .maybeSingle();

  if (pe || !perfil?.cliente_id || perfil.is_active === false) {
    redirect("/login?error=cuenta_inactiva");
  }

  const clienteId = perfil.cliente_id as string;

  const { data: prop, error: propErr } = await db
    .from("propiedades")
    .select("id, direccion, nombre, propietario_id")
    .eq("id", propiedadId)
    .eq("is_active", true)
    .maybeSingle();

  if (propErr || !prop || (prop as { propietario_id: string }).propietario_id !== clienteId) {
    notFound();
  }

  const direccion = (prop as { direccion: string }).direccion;
  const nombreProp = (prop as { nombre?: string }).nombre?.trim() || direccion;

  const { data: contratosRaw } = await db
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
      ultima_actualizacion,
      is_active,
      deleted_at,
      propiedad:propiedades ( nombre, direccion ),
      inquilino:clientes!contratos_cobranza_cliente_id_fkey ( nombre_completo ),
      locador:clientes!contratos_cobranza_locador_id_fkey ( nombre_completo )
    `,
    )
    .eq("propiedad_id", propiedadId)
    .is("deleted_at", null)
    .order("is_active", { ascending: false })
    .order("created_at", { ascending: false });

  const contratos = (contratosRaw ?? []) as Record<string, unknown>[];
  const rawContrato =
    contratos.find((c) => c.is_active === true) ?? (contratos.length > 0 ? contratos[0] : null);

  if (!rawContrato) {
    return (
      <>
        <PropietarioHeader nombre={perfil.nombre as string} />
        <main className="mx-auto flex max-w-4xl flex-col gap-8 px-4 py-6 md:px-8 md:py-8">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="ghost" size="sm" className="gap-2" asChild>
              <Link href="/propietarios/dashboard">
                <ArrowLeft className="size-4" />
                Volver al resumen
              </Link>
            </Button>
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Cobranzas</h1>
            <p className="text-muted-foreground mt-1 text-sm">{direccion}</p>
          </div>
          <p className="text-muted-foreground text-sm">
            No hay contrato de cobranzas registrado para esta propiedad.
          </p>
        </main>
      </>
    );
  }

  const r = rawContrato;
  const contrato: ContratoCobranzaRow = {
    id: r.id as string,
    propiedad_id: r.propiedad_id as string,
    cliente_id: r.cliente_id as string,
    locador_id: r.locador_id as string,
    fecha_inicio: r.fecha_inicio as string,
    fecha_vencimiento: r.fecha_vencimiento as string,
    monto_mensual: Number(r.monto_mensual),
    dia_limite_pago: Number(r.dia_limite_pago),
    meses_actualizacion: Number(r.meses_actualizacion),
    indice_actualizacion: (r.indice_actualizacion as "IPC" | "ICL") ?? "ICL",
    ultima_actualizacion: (r.ultima_actualizacion as string | null) ?? null,
    is_active: Boolean(r.is_active),
    deleted_at: (r.deleted_at as string | null | undefined) ?? null,
    propiedad: unwrapFk(
      r.propiedad as { nombre: string; direccion?: string } | { nombre: string; direccion?: string }[] | null,
    ),
    inquilino: unwrapFk(
      r.inquilino as { nombre_completo: string } | { nombre_completo: string }[] | null,
    ),
    locador: unwrapFk(r.locador as { nombre_completo: string } | { nombre_completo: string }[] | null),
  };

  await ensurePagosMensualesExistentes(db, contrato.id);

  const { data: pagosRaw } = await db
    .from("pagos")
    .select("*")
    .eq("contrato_id", contrato.id)
    .order("mes_periodo", { ascending: true });

  const pagos = (pagosRaw ?? []) as PagoRow[];

  const widgets = buildContratoWidgetData(contrato, pagos, isCalculatorConfigured());

  return (
    <>
      <PropietarioHeader nombre={perfil.nombre as string} />
      <main className="mx-auto flex max-w-4xl flex-col gap-8 px-4 py-6 md:px-8 md:py-8">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="ghost" size="sm" className="gap-2" asChild>
            <Link href="/propietarios/dashboard">
              <ArrowLeft className="size-4" />
              Volver al resumen
            </Link>
          </Button>
        </div>

        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Cobranzas</h1>
          <p className="text-muted-foreground text-sm">
            {nombreProp}
            {contrato.is_active ? (
              <Badge variant="outline" className="ml-2 border-emerald-600 text-emerald-700">
                Contrato activo
              </Badge>
            ) : (
              <Badge variant="secondary" className="ml-2">
                Contrato finalizado
              </Badge>
            )}
          </p>
          <p className="text-muted-foreground text-xs">
            Vista solo lectura. Misma información resumida que ve el inquilino en su portal.
          </p>
        </div>

        <ContratoWidgets data={widgets} />

        <ContratoDetallesCard contrato={contrato} />

        <ContratoPagosHistorial contrato={contrato} pagos={pagos} />
      </main>
    </>
  );
}
