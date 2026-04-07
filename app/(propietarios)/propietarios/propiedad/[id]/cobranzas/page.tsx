import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type { PagoRow } from "@/lib/cobranzas/types";
import { PropietarioHeader } from "@/components/propietarios/propietario-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const dynamic = "force-dynamic";

function fmtFecha(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

function estadoBadge(estado: string) {
  if (estado === "Pagado") {
    return <Badge variant="outline" className="border-emerald-600 text-emerald-800">Pagado</Badge>;
  }
  if (estado === "Atrasado") {
    return <Badge variant="destructive">Atrasado</Badge>;
  }
  return <Badge variant="secondary">Pendiente</Badge>;
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
    .select("id, direccion, propietario_id")
    .eq("id", propiedadId)
    .eq("is_active", true)
    .maybeSingle();

  if (propErr || !prop || (prop as { propietario_id: string }).propietario_id !== clienteId) {
    notFound();
  }

  const direccion = (prop as { direccion: string }).direccion;

  const { data: contratosRaw } = await db
    .from("contratos_cobranza")
    .select("id, fecha_inicio, fecha_vencimiento, is_active, monto_mensual")
    .eq("propiedad_id", propiedadId)
    .is("deleted_at", null)
    .order("is_active", { ascending: false })
    .order("created_at", { ascending: false });

  const contratos = contratosRaw ?? [];
  const contrato =
    (contratos as { id: string; is_active: boolean }[]).find((c) => c.is_active) ??
    (contratos[0] as { id: string } | undefined);

  let pagos: PagoRow[] = [];
  if (contrato?.id) {
    const { data: pagosData } = await db
      .from("pagos")
      .select("*")
      .eq("contrato_id", contrato.id)
      .order("mes_periodo", { ascending: true });
    pagos = (pagosData ?? []) as PagoRow[];
  }

  const c = contrato as
    | { id: string; fecha_inicio: string; fecha_vencimiento: string; monto_mensual: number; is_active: boolean }
    | undefined;

  const precioFmt = new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  });

  return (
    <>
      <PropietarioHeader nombre={perfil.nombre as string} />
      <main className="mx-auto max-w-4xl space-y-6 px-4 py-6 md:px-6 md:py-8">
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
          <p className="text-muted-foreground text-xs mt-2">
            Vista solo lectura. Para gestión y pagos, la administración usa el panel interno.
          </p>
        </div>

        {c ? (
          <Card className="border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Contrato de alquiler</CardTitle>
              <CardDescription>
                {c.is_active ? (
                  <Badge variant="outline" className="border-emerald-600 text-emerald-800">
                    Activo
                  </Badge>
                ) : (
                  <Badge variant="secondary">Finalizado</Badge>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <span className="text-muted-foreground">Inicio </span>
                <span className="font-medium tabular-nums">{fmtFecha(c.fecha_inicio)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Vencimiento </span>
                <span className="font-medium tabular-nums">{fmtFecha(c.fecha_vencimiento)}</span>
              </div>
              <div className="sm:col-span-2">
                <span className="text-muted-foreground">Alquiler mensual </span>
                <span className="font-semibold tabular-nums">{precioFmt.format(Number(c.monto_mensual))}</span>
              </div>
            </CardContent>
          </Card>
        ) : (
          <p className="text-muted-foreground text-sm">No hay contrato de cobranzas registrado para esta propiedad.</p>
        )}

        {pagos.length > 0 ? (
          <Card className="border shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Cuotas mensuales</CardTitle>
            </CardHeader>
            <CardContent className="p-0 sm:p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Período</TableHead>
                      <TableHead>Fecha pago</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagos.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-mono text-sm">{p.mes_periodo}</TableCell>
                        <TableCell className="tabular-nums text-sm">
                          {p.fecha_pago_realizado ? fmtFecha(p.fecha_pago_realizado) : "—"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-sm">
                          {p.monto_pagado != null
                            ? precioFmt.format(Number(p.monto_pagado))
                            : "—"}
                        </TableCell>
                        <TableCell>{estadoBadge(p.estado)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        ) : c ? (
          <p className="text-muted-foreground text-sm">Todavía no hay cuotas cargadas para este contrato.</p>
        ) : null}
      </main>
    </>
  );
}
